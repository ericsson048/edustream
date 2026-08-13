import os
import uuid as uuidlib
from collections import Counter
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_tutor.models import AITutorMessage
from apps.users.models import User

from .models import (
    Assignment,
    Extension,
    FocusSession,
    Notification,
    PushDevice,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    Skill,
    SkillEdge,
    SkillNode,
    SkillTree,
    Submission,
    UserActivity,
    UserSkill,
)
from .serializers import (
    AssignmentSerializer,
    ExtensionSerializer,
    FocusSessionSerializer,
    NotificationSerializer,
    QuizAttemptSerializer,
    QuizQuestionSerializer,
    QuizSerializer,
    RecommendedCourseSerializer,
    SkillSerializer,
    SkillEdgeSerializer,
    SkillNodeSerializer,
    SkillTreeSerializer,
    SubmissionSerializer,
    UserActivitySerializer,
    UserSkillSerializer,
    UserStatsSerializer,
)
from apps.courses.models import Course, Enrollment, Progress, CourseReview
from apps.courses.permissions import is_admin, is_instructor_or_admin, owns_learning_object


def _media_url(request, rel_path):
    return request.build_absolute_uri(f"{settings.MEDIA_URL}{rel_path}")


def _save_upload(file, subdir):
    ext = os.path.splitext(file.name)[1].lower()
    filename = f"uploads/{subdir}/{uuidlib.uuid4()}{ext}"
    path = os.path.join(settings.MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    return filename


def _create_notification(user, notification_type, title, body, link=""):
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        body=body,
        link=link,
    )


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.select_related("course", "created_by")
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "type"]

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(course__instructor=self.request.user)
        return qs.filter(course__enrollments__student=self.request.user, course__enrollments__is_active=True).distinct()

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not owns_learning_object(self.request.user, course):
            raise PermissionDenied("You cannot modify this course.")
        file = serializer.validated_data.pop("attachment", None)
        extra = {}
        if file:
            extra = {
                "instructions_url": _media_url(self.request, _save_upload(file, "assignments")),
                "instructions_name": file.name,
            }
        assignment = serializer.save(created_by=self.request.user, **extra)
        enrolled = (
            Enrollment.objects.filter(course=course, is_active=True)
            .select_related("student")
            .values_list("student_id", flat=True)
        )
        for student_id in enrolled:
            _create_notification(
                User.objects.get(id=student_id),
                "ASSIGNMENT",
                f"Nouveau devoir : {assignment.title}",
                f"Cours : {course.title}",
                link=f"/assignments/{assignment.id}",
            )

    def perform_update(self, serializer):
        file = serializer.validated_data.pop("attachment", None)
        extra = {}
        if file:
            extra = {
                "instructions_url": _media_url(self.request, _save_upload(file, "assignments")),
                "instructions_name": file.name,
            }
        serializer.save(**extra)

    @action(detail=True, methods=["post"])
    def publish_grades(self, request, pk=None):
        assignment = self.get_object()
        if not is_instructor_or_admin(request.user) or not owns_learning_object(request.user, assignment):
            raise PermissionDenied("Instructor access required.")
        updated = assignment.submissions.filter(status="GRADED").update(is_published=True)
        return Response({"published": updated})

    @action(detail=True, methods=["post"])
    def extend(self, request, pk=None):
        assignment = self.get_object()
        if not is_instructor_or_admin(request.user) or not owns_learning_object(request.user, assignment):
            raise PermissionDenied("Instructor access required.")
        student_id = request.data.get("student_id")
        new_deadline = request.data.get("new_deadline")
        if not student_id or not new_deadline:
            return Response(
                {"detail": "student_id and new_deadline are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            student = User.objects.get(id=student_id)
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
        extension, _ = Extension.objects.update_or_create(
            assignment=assignment,
            student=student,
            defaults={"new_deadline": new_deadline, "granted_by": request.user},
        )
        return Response(ExtensionSerializer(extension).data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        assignment = self.get_object()
        submissions = assignment.submissions.all()
        graded = [s for s in submissions if s.grade is not None]
        enrolled_ids = set(
            Enrollment.objects.filter(course=assignment.course, is_active=True).values_list("student_id", flat=True)
        )
        submitted_ids = set(submissions.values_list("student_id", flat=True))
        missing = User.objects.filter(id__in=enrolled_ids - submitted_ids)
        average = sum(s.grade for s in graded) / len(graded) if graded else None
        average_percent = round(float(average) / assignment.points * 100, 1) if average is not None and assignment.points else None
        distribution = {}
        for bucket_start in range(0, 100, 10):
            distribution[f"{bucket_start}-{bucket_start + 9}"] = 0
        distribution["90-100"] = 0
        for s in graded:
            if not assignment.points:
                continue
            percent = float(s.grade) / assignment.points * 100
            bucket_start = min(int(percent) // 10 * 10, 90)
            bucket = f"{bucket_start}-{bucket_start + 9}" if bucket_start < 90 else "90-100"
            distribution[bucket] = distribution.get(bucket, 0) + 1
        return Response({
            "total_enrolled": len(enrolled_ids),
            "submitted_count": submissions.count(),
            "graded_count": len(graded),
            "missing_count": len(missing),
            "missing_students": [
                {"id": u.id, "full_name": u.full_name, "email": u.email} for u in missing
            ],
            "late_count": sum(1 for s in submissions if s.is_late),
            "average_grade": float(average) if average is not None else None,
            "average_percent": average_percent,
            "distribution": distribution,
        })


class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["assignment", "status"]

    def get_queryset(self):
        qs = Submission.objects.select_related("assignment", "student")
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(assignment__course__instructor=self.request.user)
        return qs.filter(student=self.request.user)

    def perform_create(self, serializer):
        assignment = serializer.validated_data["assignment"]
        if not Enrollment.objects.filter(student=self.request.user, course=assignment.course, is_active=True).exists():
            raise PermissionDenied("Enrollment required.")
        file = serializer.validated_data.pop("file", None)
        kwargs = {}
        if file:
            ext = os.path.splitext(file.name)[1].lower()
            allowed = assignment.allowed_extensions or None
            if allowed and ext not in allowed:
                raise ValidationError({"file": f"File type '{ext}' is not allowed."})
            if file.size > assignment.max_file_size_mb * 1024 * 1024:
                raise ValidationError({"file": f"File must be smaller than {assignment.max_file_size_mb}MB."})
            kwargs = {
                "file_url": _media_url(self.request, _save_upload(file, "submissions")),
                "file_name": file.name,
                "file_size": file.size,
            }
        serializer.save(student=self.request.user, **kwargs)

    def perform_update(self, serializer):
        submission = self.get_object()
        if submission.is_published:
            raise PermissionDenied("Cette soumission a déjà été publiée.")
        file = serializer.validated_data.pop("file", None)
        kwargs = {}
        if file:
            assignment = serializer.validated_data.get("assignment") or submission.assignment
            ext = os.path.splitext(file.name)[1].lower()
            allowed = assignment.allowed_extensions or None
            if allowed and ext not in allowed:
                raise ValidationError({"file": f"File type '{ext}' is not allowed."})
            if file.size > assignment.max_file_size_mb * 1024 * 1024:
                raise ValidationError({"file": f"File must be smaller than {assignment.max_file_size_mb}MB."})
            kwargs = {
                "file_url": _media_url(self.request, _save_upload(file, "submissions")),
                "file_name": file.name,
                "file_size": file.size,
            }
        serializer.save(**kwargs)
        if submission.status == Submission.Status.GRADED:
            submission.status = Submission.Status.SUBMITTED
            submission.grade = None
            submission.feedback = ""
            submission.is_published = False
            submission.save(update_fields=["status", "grade", "feedback", "is_published", "updated_at"])

    @action(detail=True, methods=["post"], url_path="grade")
    def grade(self, request, pk=None):
        submission = self.get_object()
        if not is_instructor_or_admin(request.user) or not owns_learning_object(request.user, submission.assignment):
            raise PermissionDenied("Instructor access required.")

        grade_raw = request.data.get("grade")
        if grade_raw in (None, ""):
            return Response({"detail": "grade is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            grade = Decimal(str(grade_raw))
        except InvalidOperation:
            return Response({"detail": "grade must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        if grade < 0 or grade > submission.assignment.points:
            return Response(
                {"detail": f"grade must be between 0 and {submission.assignment.points}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission.grade = grade
        submission.feedback = request.data.get("feedback", "")
        submission.status = request.data.get("status", Submission.Status.GRADED)
        submission.save(update_fields=["grade", "feedback", "status", "updated_at"])

        _create_notification(
            submission.student,
            "GRADE",
            f"Devoir noté : {submission.assignment.title}",
            f"Votre note est {grade}/{submission.assignment.points}.",
            link="/grades",
        )
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        submission = self.get_object()
        if not is_instructor_or_admin(request.user) or not owns_learning_object(request.user, submission.assignment):
            raise PermissionDenied("Instructor access required.")
        submission.is_published = True
        submission.save(update_fields=["is_published"])
        return Response(self.get_serializer(submission).data)


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.select_related("lesson", "module", "created_by")
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["lesson", "module"]

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(
                Q(module__course__instructor=self.request.user) |
                Q(lesson__module__course__instructor=self.request.user)
            ).distinct()
        return qs.filter(
            Q(module__course__enrollments__student=self.request.user, module__course__enrollments__is_active=True) |
            Q(lesson__module__course__enrollments__student=self.request.user, lesson__module__course__enrollments__is_active=True)
        ).distinct()

    def perform_create(self, serializer):
        module = serializer.validated_data.get("module")
        lesson = serializer.validated_data.get("lesson")
        target = module or lesson
        if target is None:
            raise PermissionDenied("A module or lesson is required.")
        if not owns_learning_object(self.request.user, target):
            raise PermissionDenied("You cannot modify this content.")
        serializer.save(created_by=self.request.user)


class QuizQuestionViewSet(viewsets.ModelViewSet):
    queryset = QuizQuestion.objects.select_related("quiz")
    serializer_class = QuizQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["quiz"]

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(
                Q(quiz__module__course__instructor=self.request.user) |
                Q(quiz__lesson__module__course__instructor=self.request.user)
            ).distinct()
        return qs.filter(
            Q(quiz__module__course__enrollments__student=self.request.user, quiz__module__course__enrollments__is_active=True) |
            Q(quiz__lesson__module__course__enrollments__student=self.request.user, quiz__lesson__module__course__enrollments__is_active=True)
        ).distinct()

    def perform_create(self, serializer):
        quiz = serializer.validated_data["quiz"]
        if not owns_learning_object(self.request.user, quiz):
            raise PermissionDenied("You cannot modify this quiz.")
        serializer.save()


class QuizAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["quiz", "passed"]

    def get_queryset(self):
        qs = QuizAttempt.objects.select_related("quiz", "student")
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(
                Q(quiz__module__course__instructor=self.request.user) |
                Q(quiz__lesson__module__course__instructor=self.request.user)
            ).distinct()
        return qs.filter(student=self.request.user)

    def perform_create(self, serializer):
        quiz = serializer.validated_data["quiz"]
        course = quiz.module.course if quiz.module_id else quiz.lesson.module.course
        if not Enrollment.objects.filter(student=self.request.user, course=course, is_active=True).exists():
            raise PermissionDenied("Enrollment required.")
        serializer.save(student=self.request.user)


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Skill.objects.filter(is_active=True)
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]


class UserSkillViewSet(viewsets.ModelViewSet):
    serializer_class = UserSkillSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        return UserSkill.objects.filter(user=self.request.user).select_related("skill")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SkillTreeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SkillTreeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SkillTree.objects.filter(user=self.request.user).prefetch_related("nodes", "edges")

    @action(detail=False, methods=["post"])
    def generate(self, request):
        from .skill_tree_generator import generate_skill_tree
        SkillTree.objects.filter(user=request.user).update(is_active=False)
        tree = generate_skill_tree(request.user)
        if not tree:
            return Response({"detail": "Unable to generate skill tree. Enroll in courses first."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(tree)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def unlock_next(self, request, pk=None):
        tree = self.get_object()
        node_id = request.data.get("node_id")
        try:
            node = tree.nodes.get(id=node_id)
        except SkillNode.DoesNotExist:
            return Response({"detail": "Node not found."}, status=status.HTTP_404_NOT_FOUND)

        if node.status == SkillNode.Status.LOCKED:
            parents = SkillEdge.objects.filter(child=node).select_related("parent")
            all_parents_complete = all(
                edge.parent.status == SkillNode.Status.COMPLETED or edge.parent.status == SkillNode.Status.UNLOCKED
                for edge in parents
            )
            if not parents.exists() or all_parents_complete:
                node.status = SkillNode.Status.UNLOCKED
                node.save(update_fields=["status"])
                return Response(SkillNodeSerializer(node).data)

        return Response({"detail": "Cannot unlock this node yet."}, status=status.HTTP_400_BAD_REQUEST)


class FocusSessionViewSet(viewsets.ModelViewSet):
    serializer_class = FocusSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return FocusSession.objects.filter(user=self.request.user).order_by("-completed_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = FocusSession.objects.filter(user=request.user, mode="WORK")
        total_seconds = sum(s.duration_seconds for s in qs)
        session_count = qs.count()
        return Response({
            "total_focus_minutes": round(total_seconds / 60),
            "total_sessions": session_count,
        })


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ["notification_type", "is_read"]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)

        role = self.request.query_params.get("role")
        if role:
            type_map = {
                "STUDENT": ["ASSIGNMENT", "GRADE", "SKILL_UNLOCK", "COURSE_UPDATE"],
                "INSTRUCTOR": ["LIVE_SESSION", "LIVE_REMINDER", "MESSAGE"],
                "ADMIN": ["SYSTEM"],
            }
            types = type_map.get(role)
            if types:
                qs = qs.filter(notification_type__in=types)

        recipient_role = self.request.query_params.get("recipient_role")
        if recipient_role and self.request.user.role == "ADMIN":
            qs = Notification.objects.filter(user__role=recipient_role)

        return qs

    @action(detail=True, methods=["patch"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "ok"})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"count": count})

    @action(detail=False, methods=["post"])
    def register_push(self, request):
        token = request.data.get("token", "").strip()
        platform = request.data.get("platform", "android")
        if not token:
            return Response({"detail": "token is required."}, status=status.HTTP_400_BAD_REQUEST)
        obj, created = PushDevice.objects.update_or_create(
            expo_push_token=token,
            defaults={"user": request.user, "platform": platform},
        )
        return Response({"status": "ok", "created": created})

    @action(detail=False, methods=["post"])
    def unregister_push(self, request):
        token = request.data.get("token", "").strip()
        if not token:
            return Response({"detail": "token is required."}, status=status.HTTP_400_BAD_REQUEST)
        PushDevice.objects.filter(expo_push_token=token, user=request.user).delete()
        return Response({"status": "ok"})


class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserActivity.objects.filter(user=self.request.user)


class UserStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        today = now.date()
        yesterday = today - timedelta(days=1)

        enrollments = Enrollment.objects.filter(student=user, is_active=True)
        courses_in_progress = enrollments.count()

        completed_course_ids = set()
        for enrollment in enrollments:
            total = enrollment.course.modules.aggregate(c=Count("lessons"))["c"] or 0
            done = Progress.objects.filter(enrollment=enrollment, is_completed=True).count()
            if total > 0 and done >= total:
                completed_course_ids.add(enrollment.course_id)
        courses_completed = len(completed_course_ids)

        lessons_completed = Progress.objects.filter(enrollment__student=user, is_completed=True).count()

        today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        lessons_completed_today = Progress.objects.filter(
            enrollment__student=user, is_completed=True, updated_at__gte=today_start
        ).count()

        streak_days = 0
        check = today
        while True:
            day_start = timezone.make_aware(datetime.combine(check, datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            has_activity = UserActivity.objects.filter(
                user=user, created_at__gte=day_start, created_at__lt=day_end
            ).exists()
            if has_activity:
                streak_days += 1
                check -= timedelta(days=1)
            else:
                break

        focus_qs = FocusSession.objects.filter(user=user, mode="WORK")
        total_focus_seconds = sum(s.duration_seconds for s in focus_qs)

        avg_score = QuizAttempt.objects.filter(student=user).aggregate(avg=Avg("score"))["avg"] or 0.0

        ai_tokens = AITutorMessage.objects.filter(user=user).count()

        skills_earned = list(
            UserSkill.objects.filter(user=user, status=UserSkill.Status.COMPLETED).values_list(
                "skill__title", flat=True
            )
        )

        last_activity = (
            UserActivity.objects.filter(user=user).values_list("created_at", flat=True).first()
        )

        data = {
            "courses_in_progress": courses_in_progress,
            "courses_completed": courses_completed,
            "lessons_completed": lessons_completed,
            "lessons_completed_today": lessons_completed_today,
            "streak_days": streak_days,
            "total_focus_minutes": round(total_focus_seconds / 60),
            "average_quiz_score": float(avg_score),
            "total_ai_tokens_used": ai_tokens,
            "skills_earned": skills_earned,
            "last_activity": last_activity,
        }
        return Response(UserStatsSerializer(data).data)


class RecommendedCoursesView(ListAPIView):
    serializer_class = RecommendedCourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        course_ids = set()

        if user.role == "STUDENT":
            enrolled_ids = set(
                Enrollment.objects.filter(student=user, is_active=True).values_list("course_id", flat=True)
            )
            user_skills = UserSkill.objects.filter(user=user).select_related("skill")
            skill_course_ids = set()
            for us in user_skills:
                for course in us.skill.related_courses.all():
                    skill_course_ids.add(course.id)

            enrolled_courses = Course.objects.filter(id__in=enrolled_ids)
            cat_counts = Counter()
            for course in enrolled_courses:
                if course.category_id:
                    cat_counts[course.category_id] += 1
            top_cats = [c for c, _ in cat_counts.most_common(3)]

            cat_course_ids = set(
                Course.objects.filter(category_id__in=top_cats)
                .exclude(id__in=enrolled_ids)
                .values_list("id", flat=True)
            )

            top_rated_ids = set(
                Course.objects.annotate(avg_rating=Avg("reviews__rating"))
                .filter(avg_rating__gte=4.5)
                .exclude(id__in=enrolled_ids)
                .order_by("-avg_rating")[:5]
                .values_list("id", flat=True)
            )

            course_ids = (skill_course_ids | cat_course_ids | top_rated_ids) - enrolled_ids

        if not course_ids:
            course_ids = set(
                Course.objects.filter(is_published=True)
                .annotate(avg_rating=Avg("reviews__rating"))
                .order_by("-avg_rating", "-created_at")[:10]
                .values_list("id", flat=True)
            )

        return (
            Course.objects.filter(id__in=course_ids, is_published=True)
            .annotate(
                avg_rating=Avg("reviews__rating"),
                review_count=Count("reviews"),
                enrolled_count=Count("enrollments", filter=Q(enrollments__is_active=True)),
            )
            .select_related("category")
        )

    def _get_insights(self, course, user_skills):
        insights = []
        common = set(course.skills.values_list("title", flat=True)) & user_skills
        if common:
            insights.append(f"✅ Matches your skills: {', '.join(list(common)[:2])}")
        if course.avg_rating and course.avg_rating >= 4.5:
            insights.append(f"⭐ Top rated ({round(course.avg_rating, 1)}/5)")
        if course.enrolled_count >= 50:
            insights.append(f"👥 {course.enrolled_count}+ students enrolled")
        if course.level and user_skills:
            insights.append(f"📈 {course.get_level_display()} level")
        if course.estimated_hours:
            insights.append(f"⏱ ~{course.estimated_hours}h to complete")
        return insights

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        enrolled_ids = set()
        if request.user.role == "STUDENT":
            enrolled_ids = set(
                Enrollment.objects.filter(student=request.user, is_active=True).values_list("course_id", flat=True)
            )

        user_skills = set(
            UserSkill.objects.filter(user=request.user, status=UserSkill.Status.COMPLETED)
            .values_list("skill__title", flat=True)
        )

        results = []
        for course in queryset:
            if course.id in enrolled_ids:
                continue
            reason = self._get_reason(course, user_skills)
            if course.thumbnail_file:
                thumbnail = request.build_absolute_uri(course.thumbnail_file.url) if request else course.thumbnail_file.url
            else:
                thumbnail = course.thumbnail_url or ""
            results.append({
                "id": course.id,
                "title": course.title,
                "slug": course.slug,
                "thumbnail_url": thumbnail,
                "category_name": course.category.name if course.category else None,
                "level": course.level,
                "estimated_hours": course.estimated_hours,
                "average_rating": float(course.avg_rating or 0),
                "review_count": course.review_count,
                "enrolled_count": course.enrolled_count,
                "reason": reason,
                "insights": self._get_insights(course, user_skills),
            })
        return Response(results[:10])

    def _get_reason(self, course, user_skills):
        common = set(course.skills.values_list("title", flat=True)) & user_skills
        if common:
            return f"Complète tes compétences en {', '.join(list(common)[:2])}"
        if course.avg_rating and course.avg_rating >= 4.5:
            rating = round(course.avg_rating, 1)
            return f"Très bien noté ({rating}/5) par les étudiants"
        if course.category:
            return f"Populaire dans {course.category.name}"
        return "Recommandé pour toi"
