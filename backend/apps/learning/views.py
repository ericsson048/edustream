from collections import Counter
from datetime import date, datetime, timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_tutor.models import AITutorMessage

from .models import (
    Assignment,
    FocusSession,
    Notification,
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
        serializer.save(created_by=self.request.user)


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
        serializer.save(student=self.request.user)

    @action(detail=True, methods=["post"], url_path="grade")
    def grade(self, request, pk=None):
        submission = self.get_object()
        if not is_instructor_or_admin(request.user) or not owns_learning_object(request.user, submission.assignment):
            raise PermissionDenied("Instructor access required.")

        grade = request.data.get("grade")
        if grade in (None, ""):
            return Response({"detail": "grade is required."}, status=status.HTTP_400_BAD_REQUEST)

        submission.grade = grade
        submission.feedback = request.data.get("feedback", "")
        submission.status = request.data.get("status", Submission.Status.GRADED)
        submission.save(update_fields=["grade", "feedback", "status", "updated_at"])
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
        return Notification.objects.filter(user=self.request.user)

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
            results.append({
                "id": course.id,
                "title": course.title,
                "slug": course.slug,
                "thumbnail_url": course.thumbnail_url or "",
                "category_name": course.category.name if course.category else None,
                "level": course.level,
                "estimated_hours": course.estimated_hours,
                "average_rating": float(course.avg_rating or 0),
                "review_count": course.review_count,
                "enrolled_count": course.enrolled_count,
                "reason": reason,
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
