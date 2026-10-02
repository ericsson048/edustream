import uuid
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from django.conf import settings

from django.db.models import Avg, Count

from .models import (
    AttendanceRecord,
    Category,
    Certificate,
    ContentBlock,
    Course,
    CourseGrade,
    CourseInvitation,
    CourseReview,
    CourseVersion,
    Enrollment,
    Evaluation,
    EvaluationGrade,
    LearningPath,
    Lesson,
    LessonComment,
    Module,
    Note,
    PathCourse,
    Progress,
    Resource,
    Section,
    Tag,
    UniversitySession,
    generate_invitation_code,
)
from .permissions import (
    IsAdminOrReadOnly,
    IsInstructorOrReadOnly,
    IsInstructorOwnerOrAdmin,
    IsOwnerOrReadOnly,
    is_admin,
    owns_learning_object,
)
from .serializers import (
    AttendanceRecordSerializer,
    CategorySerializer,
    CertificateSerializer,
    ContentBlockSerializer,
    CourseGradeSerializer,
    CourseInvitationSerializer,
    CourseReviewSerializer,
    CourseSerializer,
    CourseVersionSerializer,
    EnrollmentSerializer,
    EvaluationGradeSerializer,
    EvaluationSerializer,
    LearningPathSerializer,
    LessonCommentSerializer,
    LessonSerializer,
    ModuleSerializer,
    NoteSerializer,
    PathCourseSerializer,
    ProgressSerializer,
    ResourceSerializer,
    SectionSerializer,
    TagSerializer,
    UniversitySessionSerializer,
)
from .university import (
    attendance_rate,
    attendance_summary,
    can_justify,
    compute_average,
    create_session_records,
    effective_note,
    eligible_evaluations,
    recompute_course_grades,
    update_course_grade,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["slug"]
    search_fields = ["name", "description"]
    ordering_fields = ["order", "name", "created_at"]

    @method_decorator(cache_page(60 * 5))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("instructor", "category").all()
    serializer_class = CourseSerializer
    permission_classes = [IsInstructorOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ["category", "category__slug", "level", "instructor", "is_published"]
    search_fields = ["title", "description", "category__name"]
    ordering_fields = ["created_at", "price"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if is_admin(user):
            return qs
        if user.role == "INSTRUCTOR":
            return (qs.filter(instructor=user) | qs.filter(is_published=True)).distinct()
        return (qs.filter(is_published=True) | qs.filter(enrollments__student=user, enrollments__is_active=True)).distinct()

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(detail=True, methods=["post"], url_path="import-outline")
    def import_outline(self, request, pk=None):
        course = self.get_object()
        outline = request.data.get("outline")
        if not isinstance(outline, dict):
            return Response({"detail": "outline is required."}, status=status.HTTP_400_BAD_REQUEST)

        modules_payload = outline.get("modules") or []
        if not isinstance(modules_payload, list):
            return Response({"detail": "outline.modules must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            serializer = self.get_serializer(
                course,
                data={
                    "title": outline.get("title", course.title),
                    "description": outline.get("description", course.description),
                    "level": outline.get("level", course.level),
                    "price": outline.get("price", course.price),
                    "learning_objectives": outline.get("learning_objectives", course.learning_objectives),
                    "prerequisites": outline.get("prerequisites", course.prerequisites),
                    "target_audience": request.data.get("target_audience", course.target_audience),
                    "estimated_hours": request.data.get("estimated_hours", course.estimated_hours),
                    "language": request.data.get("language", course.language),
                    "category_id": request.data.get("category_id", course.category_id),
                    "subtitle": request.data.get("subtitle", course.subtitle),
                    "is_published": request.data.get("is_published", course.is_published),
                },
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            last_order = course.modules.count()
            for module_index, module_data in enumerate(modules_payload, start=1):
                created_module = Module.objects.create(
                    course=course,
                    title=module_data.get("title") or f"Module {last_order + module_index}",
                    description=module_data.get("description", ""),
                    learning_objectives=module_data.get("learning_objectives", []),
                    estimated_minutes=module_data.get("estimated_minutes", 0),
                    is_published=module_data.get("is_published", True),
                    order=last_order + module_index,
                )
                created_lessons = []
                for lesson_index, lesson_data in enumerate(module_data.get("lessons") or [], start=1):
                    created_lesson = Lesson.objects.create(
                        module=created_module,
                        title=lesson_data.get("title") or f"Lesson {lesson_index}",
                        content=lesson_data.get("content", ""),
                        lesson_type=lesson_data.get("lesson_type", "VIDEO"),
                        status=lesson_data.get("status", "PUBLISHED"),
                        video_url=lesson_data.get("video_url", ""),
                        transcript=lesson_data.get("transcript", ""),
                        instructor_notes=lesson_data.get("instructor_notes", ""),
                        duration_seconds=lesson_data.get("duration_seconds", 0),
                        order=lesson_index,
                        is_preview=lesson_data.get("is_preview", False),
                    )
                    created_lessons.append(created_lesson)
                    for resource_data in lesson_data.get("resources") or []:
                        Resource.objects.create(
                            lesson=created_lesson,
                            title=resource_data.get("title", "Resource"),
                            kind=resource_data.get("kind", "OTHER"),
                            description=resource_data.get("description", ""),
                            file_url=resource_data.get("file_url", ""),
                        )

                for resource_data in module_data.get("resources") or []:
                    if created_lessons:
                        Resource.objects.create(
                            lesson=created_lessons[0],
                            title=resource_data.get("title", "Resource"),
                            kind=resource_data.get("kind", "OTHER"),
                            description=resource_data.get("description", ""),
                            file_url=resource_data.get("file_url", ""),
                        )

                quiz_data = module_data.get("quiz")
                if quiz_data:
                    from apps.learning.models import Quiz, QuizQuestion

                    quiz = Quiz.objects.create(
                        module=created_module,
                        title=quiz_data.get("title") or f"{created_module.title} Quiz",
                        passing_score=quiz_data.get("passing_score", 70),
                        time_limit_minutes=quiz_data.get("time_limit_minutes", 10),
                        created_by=request.user,
                    )
                    for question_index, question_data in enumerate(quiz_data.get("questions") or [], start=1):
                        QuizQuestion.objects.create(
                            quiz=quiz,
                            prompt=question_data.get("prompt", ""),
                            options=question_data.get("options", []),
                            correct_index=question_data.get("correct_index", 0),
                            order=question_index,
                        )

        course.refresh_from_db()
        return Response(self.get_serializer(course).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="students")
    def students(self, request, pk=None):
        course = self.get_object()
        if not is_admin(request.user) and course.instructor_id != request.user.id:
            return Response(
                {"detail": "You cannot view this course's students."},
                status=status.HTTP_403_FORBIDDEN,
            )
        enrollments = (
            Enrollment.objects.filter(course=course, is_active=True)
            .select_related("student")
            .prefetch_related("progress_items")
            .order_by("-purchased_at")
        )
        total_lessons = Lesson.objects.filter(module__course=course).count()
        rows = []
        for enrollment in enrollments:
            completed = enrollment.progress_items.filter(is_completed=True).count()
            rows.append(
                {
                    "enrollment_id": enrollment.id,
                    "student_id": enrollment.student_id,
                    "student_name": enrollment.student.full_name,
                    "student_email": enrollment.student.email,
                    "joined_at": enrollment.purchased_at,
                    "is_active": enrollment.is_active,
                    "completed_lessons": completed,
                    "total_lessons": total_lessons,
                    "completion_percent": int(completed / total_lessons * 100) if total_lessons else 0,
                }
            )
        return Response({"count": len(rows), "results": rows})

    @action(detail=True, methods=["post"], url_path="students/remove")
    def remove_student(self, request, pk=None):
        course = self.get_object()
        enrollment_id = request.data.get("enrollment_id")
        if not enrollment_id:
            return Response({"detail": "enrollment_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        enrollment = Enrollment.objects.filter(id=enrollment_id, course=course).first()
        if not enrollment:
            return Response({"detail": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)
        enrollment.delete()
        return Response({"detail": "Student removed from the course."}, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="invitations",
        permission_classes=[IsInstructorOwnerOrAdmin],
    )
    def invitations(self, request, pk=None):
        course = self.get_object()
        if not is_admin(request.user) and course.instructor_id != request.user.id:
            return Response(
                {"detail": "You cannot manage this course's invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == "GET":
            qs = CourseInvitation.objects.filter(course=course).order_by("-created_at")
            serializer = CourseInvitationSerializer(qs, many=True)
            return Response({"count": qs.count(), "results": serializer.data})

        serializer = CourseInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        max_uses = serializer.validated_data.get("max_uses", 0)
        expires_at = serializer.validated_data.get("expires_at")
        if expires_at is None and course.end_date:
            expires_at = timezone.make_aware(datetime.combine(course.end_date, datetime.min.time()))
        invitation = CourseInvitation.objects.create(
            course=course,
            code=generate_invitation_code(),
            max_uses=max_uses,
            expires_at=expires_at,
            created_by=request.user,
        )
        return Response(
            CourseInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="invitations/revoke",
        permission_classes=[IsInstructorOwnerOrAdmin],
    )
    def revoke_invitation(self, request, pk=None):
        course = self.get_object()
        if not is_admin(request.user) and course.instructor_id != request.user.id:
            return Response(
                {"detail": "You cannot manage this course's invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        invitation_id = request.data.get("invitation_id")
        if not invitation_id:
            return Response({"detail": "invitation_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        invitation = CourseInvitation.objects.filter(id=invitation_id, course=course).first()
        if not invitation:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)
        invitation.is_active = False
        invitation.save(update_fields=["is_active"])
        return Response({"detail": "Invitation révoquée."}, status=status.HTTP_200_OK)


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related("course").all()
    serializer_class = ModuleSerializer
    permission_classes = [IsInstructorOwnerOrAdmin]
    filterset_fields = ["course"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_admin(user):
            return qs
        if user.role == "INSTRUCTOR":
            return (qs.filter(course__instructor=user) | qs.filter(course__is_published=True)).distinct()
        return qs.filter(
            course__is_published=True,
            is_published=True,
            course__enrollments__student=user,
            course__enrollments__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not owns_learning_object(self.request.user, course):
            raise PermissionDenied("You cannot modify this course.")
        serializer.save()


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related("module", "module__course").all()
    serializer_class = LessonSerializer
    permission_classes = [IsInstructorOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ["module", "module__course"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_admin(user):
            return qs
        if user.role == "INSTRUCTOR":
            return (qs.filter(module__course__instructor=user) | qs.filter(module__course__is_published=True)).distinct()
        return qs.filter(
            module__course__is_published=True,
            module__is_published=True,
            status=Lesson.Status.PUBLISHED,
            module__course__enrollments__student=user,
            module__course__enrollments__is_active=True,
        ).distinct()

    def retrieve(self, request, *args, **kwargs):
        lesson = self.get_object()
        user = request.user
        if user.role not in {"ADMIN", "INSTRUCTOR"}:
            from apps.courses.models import is_lesson_accessible
            accessible, reason = is_lesson_accessible(user.id, lesson)
            if not accessible:
                from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
                raise DRFPermissionDenied(detail=reason or "Lesson is locked")
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        module = serializer.validated_data["module"]
        if not owns_learning_object(self.request.user, module):
            raise PermissionDenied("You cannot modify this module.")
        serializer.save()


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related("lesson", "lesson__module").all()
    serializer_class = ResourceSerializer
    permission_classes = [IsInstructorOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ["lesson"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_admin(user):
            return qs
        if user.role == "INSTRUCTOR":
            return (qs.filter(lesson__module__course__instructor=user) | qs.filter(lesson__module__course__is_published=True)).distinct()
        return qs.filter(
            lesson__module__course__is_published=True,
            lesson__module__is_published=True,
            lesson__status=Lesson.Status.PUBLISHED,
            lesson__module__course__enrollments__student=user,
            lesson__module__course__enrollments__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        lesson = serializer.validated_data["lesson"]
        if not owns_learning_object(self.request.user, lesson):
            raise PermissionDenied("You cannot modify this lesson.")
        serializer.save()


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "is_active"]

    def get_queryset(self):
        qs = Enrollment.objects.select_related("student", "course")
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(course__instructor=self.request.user)
        return qs.filter(student=self.request.user)

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not course.is_published:
            raise PermissionDenied("This course is not available for enrollment.")

        invitation = None
        if course.course_type == Course.CourseType.MARGINAL:
            invitation = self._consume_invitation(course)
        elif course.price > 0:
            from apps.billing.models import Transaction
            has_paid = Transaction.objects.filter(
                student=self.request.user,
                course=course,
                status=Transaction.Status.COMPLETED,
            ).exists()
            if not has_paid:
                raise PermissionDenied("You must purchase this course before enrolling.")
        serializer.save(student=self.request.user, invitation=invitation)

    def _consume_invitation(self, course):
        code = (self.request.data.get("invitation_code") or "").strip()
        if not code:
            raise PermissionDenied("Ce cours marginal requiert un code d'invitation.")
        invitation = (
            CourseInvitation.objects.filter(code__iexact=code, course=course, is_active=True)
            .select_related("course")
            .first()
        )
        if invitation is None:
            raise PermissionDenied("Code d'invitation invalide pour ce cours.")
        if invitation.expires_at and invitation.expires_at < timezone.now():
            raise PermissionDenied("Cette invitation a expiré.")
        if invitation.max_uses and invitation.used_count >= invitation.max_uses:
            raise PermissionDenied("Cette invitation a atteint sa limite d'utilisations.")
        if invitation.course.end_date and invitation.course.end_date < timezone.now().date():
            raise PermissionDenied("La période de ce cours marginal est terminée.")
        invitation.used_count += 1
        invitation.save(update_fields=["used_count"])
        return invitation


class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["enrollment", "lesson", "is_completed"]

    def get_queryset(self):
        qs = Progress.objects.select_related("enrollment", "lesson")
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(enrollment__course__instructor=self.request.user)
        return qs.filter(enrollment__student=self.request.user)

    def perform_create(self, serializer):
        enrollment = serializer.validated_data["enrollment"]
        lesson = serializer.validated_data["lesson"]
        if enrollment.student_id != self.request.user.id:
            raise PermissionDenied("You cannot create progress for another student.")
        if lesson.module.course_id != enrollment.course_id:
            raise PermissionDenied("Lesson does not belong to this enrollment.")
        serializer.save()

    def perform_update(self, serializer):
        progress = self.get_object()
        if progress.enrollment.student_id != self.request.user.id and not is_admin(self.request.user):
            raise PermissionDenied("You cannot modify this progress.")
        serializer.save()


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ["lesson"]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).select_related("lesson")

    def perform_create(self, serializer):
        lesson = serializer.validated_data["lesson"]
        if not Enrollment.objects.filter(student=self.request.user, course=lesson.module.course, is_active=True).exists():
            raise PermissionDenied("Enrollment required.")
        serializer.save(user=self.request.user)


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course"]

    def get_queryset(self):
        qs = Certificate.objects.select_related("course", "user")
        if self.request.user.role == "ADMIN":
            return qs
        return qs.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="claim")
    def claim(self, request):
        course_id = request.data.get("course")
        if not course_id:
            return Response({"detail": "course is required."}, status=status.HTTP_400_BAD_REQUEST)

        enrollment = Enrollment.objects.filter(student=request.user, course_id=course_id, is_active=True).select_related("course").first()
        if enrollment is None:
            raise PermissionDenied("Enrollment required.")

        published_lessons = Lesson.objects.filter(module__course_id=course_id, status=Lesson.Status.PUBLISHED)
        total_lessons = published_lessons.count()
        if total_lessons == 0:
            return Response({"detail": "No published lessons are available for this course yet."}, status=status.HTTP_400_BAD_REQUEST)

        completed_lessons = Progress.objects.filter(
            enrollment=enrollment,
            lesson__in=published_lessons,
            is_completed=True,
        ).values("lesson_id").distinct().count()

        if completed_lessons < total_lessons:
            return Response(
                {"detail": "Complete all published lessons before requesting your certificate."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        certificate, _ = Certificate.objects.get_or_create(
            user=request.user,
            course=enrollment.course,
            defaults={"certificate_code": f"EDU-{uuid.uuid4().hex[:12].upper()}"},
        )
        return Response(self.get_serializer(certificate).data)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsInstructorOrReadOnly]
    pagination_class = None


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.select_related("course").all()
    serializer_class = SectionSerializer
    permission_classes = [IsInstructorOwnerOrAdmin]
    filterset_fields = ["course"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_admin(user) or user.role == "INSTRUCTOR":
            return qs
        return qs.filter(course__is_published=True)

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not owns_learning_object(self.request.user, course):
            raise PermissionDenied("You cannot modify this course.")
        serializer.save()


class ContentBlockViewSet(viewsets.ModelViewSet):
    queryset = ContentBlock.objects.all()
    serializer_class = ContentBlockSerializer
    permission_classes = [IsInstructorOwnerOrAdmin]
    filterset_fields = ["lesson", "kind"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_admin(user) or user.role == "INSTRUCTOR":
            return qs
        return qs.filter(lesson__status=Lesson.Status.PUBLISHED, lesson__module__is_published=True)

    def perform_create(self, serializer):
        serializer.save()


class CourseReviewViewSet(viewsets.ModelViewSet):
    serializer_class = CourseReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ["course"]

    def get_queryset(self):
        return CourseReview.objects.select_related("user", "course").all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LessonCommentViewSet(viewsets.ModelViewSet):
    serializer_class = LessonCommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ["lesson"]

    def get_queryset(self):
        return LessonComment.objects.select_related("user", "lesson").filter(parent__isnull=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CourseVersionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "is_published"]

    def get_queryset(self):
        qs = CourseVersion.objects.select_related("course").all()
        user = self.request.user
        if is_admin(user):
            return qs
        if user.role == "INSTRUCTOR":
            return qs.filter(course__instructor=user)
        return qs.filter(course__is_published=True, is_published=True)


class LearningPathViewSet(viewsets.ModelViewSet):
    queryset = LearningPath.objects.prefetch_related("path_courses__course").all()
    serializer_class = LearningPathSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["is_active"]
    search_fields = ["title", "description"]


class CourseStudentsOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in {"INSTRUCTOR", "ADMIN"}:
            raise PermissionDenied("Instructor access required.")

        courses = Course.objects.all() if is_admin(user) else Course.objects.filter(instructor=user)
        course_ids = list(courses.values_list("id", flat=True))
        if not course_ids:
            return Response({"count": 0, "results": []})

        enrollments = (
            Enrollment.objects.filter(course_id__in=course_ids, is_active=True)
            .select_related("student", "course")
            .prefetch_related("progress_items")
            .order_by("-purchased_at")
        )
        lessons_per_course = {
            row["module__course_id"]: row["count"]
            for row in Lesson.objects.filter(module__course_id__in=course_ids)
            .values("module__course_id")
            .annotate(count=Count("id"))
        }

        rows = []
        for enrollment in enrollments:
            total_lessons = lessons_per_course.get(enrollment.course_id, 0)
            completed = enrollment.progress_items.filter(is_completed=True).count()
            rows.append(
                {
                    "enrollment_id": enrollment.id,
                    "student_id": enrollment.student_id,
                    "student_name": enrollment.student.full_name,
                    "student_email": enrollment.student.email,
                    "joined_at": enrollment.purchased_at,
                    "is_active": enrollment.is_active,
                    "completed_lessons": completed,
                    "total_lessons": total_lessons,
                    "completion_percent": int(completed / total_lessons * 100) if total_lessons else 0,
                    "course": {
                        "id": enrollment.course_id,
                        "title": enrollment.course.title,
                    },
                }
            )
        return Response({"count": len(rows), "results": rows})


class CourseStudentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        if user.role not in {"INSTRUCTOR", "ADMIN"}:
            raise PermissionDenied("Instructor access required.")

        from django.contrib.auth import get_user_model
        from django.db.models import Avg as AvgAgg
        from django.db.models import Q, Sum
        from apps.ai_tutor.models import AITutorMessage
        from apps.billing.models import Transaction
        from apps.learning.models import FocusSession, QuizAttempt, Submission, UserActivity
        from apps.users.models import User as UserModel

        try:
            student = UserModel.objects.get(pk=pk, role="STUDENT")
        except UserModel.DoesNotExist:
            raise PermissionDenied("Student not found.")

        courses = Course.objects.all() if is_admin(user) else Course.objects.filter(instructor=user)
        course_ids = list(courses.values_list("id", flat=True))
        if not course_ids:
            return Response(self._build_payload(student, [], {}, {}))

        course_id_strs = [str(c) for c in course_ids]

        enrollments = (
            Enrollment.objects.filter(student=student, course_id__in=course_ids)
            .select_related("course")
            .prefetch_related("progress_items", "progress_items__lesson")
            .order_by("-purchased_at")
        )
        lessons_per_course = {
            row["module__course_id"]: row["count"]
            for row in Lesson.objects.filter(module__course_id__in=course_ids)
            .values("module__course_id")
            .annotate(count=Count("id"))
        }

        certificates = {
            cert.course_id: cert
            for cert in Certificate.objects.filter(user=student, course_id__in=course_ids)
        }

        submissions = (
            Submission.objects.filter(student=student, assignment__course_id__in=course_ids)
            .select_related("assignment")
            .order_by("-submitted_at")
        )
        submissions_by_course = {}
        for sub in submissions:
            submissions_by_course.setdefault(sub.assignment.course_id, []).append(sub)

        enrollment_rows = []
        for enrollment in enrollments:
            course = enrollment.course
            total_lessons = lessons_per_course.get(course.id, 0)
            progress_items = list(enrollment.progress_items.select_related("lesson"))
            completed = sum(1 for p in progress_items if p.is_completed)
            quiz_agg = QuizAttempt.objects.filter(student=student).filter(
                Q(quiz__module__course=course) | Q(quiz__lesson__module__course=course)
            ).aggregate(avg=AvgAgg("score"), count=Count("id"), passed=Count("id", filter=Q(passed=True)))
            last_activity = UserActivity.objects.filter(
                user=student,
                metadata__course_id=str(course.id),
            ).values_list("created_at", flat=True).first()
            cert = certificates.get(course.id)
            enrollment_rows.append(
                {
                    "enrollment_id": enrollment.id,
                    "course": {
                        "id": course.id,
                        "title": course.title,
                        "thumbnail_url": course.thumbnail_file.url if course.thumbnail_file else (course.thumbnail_url or ""),
                    },
                    "enrolled_at": enrollment.purchased_at,
                    "is_active": enrollment.is_active,
                    "completed_lessons": completed,
                    "total_lessons": total_lessons,
                    "completion_percent": int(completed / total_lessons * 100) if total_lessons else 0,
                    "quiz_average": float(quiz_agg["avg"]) if quiz_agg["avg"] is not None else None,
                    "quiz_attempts": quiz_agg["count"],
                    "quizzes_passed": quiz_agg["passed"],
                    "last_activity": last_activity,
                    "certificate": {
                        "id": cert.id,
                        "certificate_code": cert.certificate_code,
                        "issued_at": cert.issued_at,
                    }
                    if cert
                    else None,
                    "assignments": [
                        {
                            "assignment_id": sub.assignment_id,
                            "title": sub.assignment.title,
                            "points": sub.assignment.points,
                            "status": sub.status,
                            "grade": float(sub.grade) if sub.grade is not None else None,
                            "feedback": sub.feedback or "",
                            "submitted_at": sub.submitted_at,
                        }
                        for sub in submissions_by_course.get(course.id, [])
                    ],
                    "lesson_progress": [
                        {
                            "lesson_id": p.lesson_id,
                            "title": p.lesson.title,
                            "lesson_type": p.lesson.lesson_type,
                            "is_completed": p.is_completed,
                            "completion": float(p.completion),
                            "last_position_seconds": p.last_position_seconds,
                            "updated_at": p.updated_at,
                        }
                        for p in progress_items
                    ],
                }
            )

        recent_activity = self._recent_activity(student, course_id_strs)

        transactions = (
            Transaction.objects.filter(student=student, course_id__in=course_ids)
            .select_related("course")
            .order_by("-created_at")
        )

        focus_minutes = (
            FocusSession.objects.filter(user=student, mode="WORK")
            .aggregate(total=Sum("duration_seconds"))["total"] or 0
        ) // 60

        return Response(
            self._build_payload(
                student,
                enrollment_rows,
                {
                    "courses_enrolled": len(enrollment_rows),
                    "courses_completed": sum(1 for e in enrollment_rows if e["total_lessons"] and e["completed_lessons"] >= e["total_lessons"]),
                    "avg_completion": round(
                        sum(e["completion_percent"] for e in enrollment_rows) / len(enrollment_rows)
                    ) if enrollment_rows else 0,
                    "avg_quiz": round(
                        sum(e["quiz_average"] for e in enrollment_rows if e["quiz_average"] is not None)
                        / sum(1 for e in enrollment_rows if e["quiz_average"] is not None)
                    ) if any(e["quiz_average"] is not None for e in enrollment_rows) else None,
                    "certificates_count": len(certificates),
                    "focus_minutes": focus_minutes,
                    "streak_days": self._streak_days(student),
                    "ai_messages": AITutorMessage.objects.filter(user=student).count(),
                    "notes_count": Note.objects.filter(
                        user=student, lesson__module__course_id__in=course_ids
                    ).count(),
                    "transactions_count": transactions.count(),
                },
                {
                    "recent_activity": recent_activity,
                    "transactions": [
                        {
                            "id": tx.id,
                            "course_title": tx.course.title,
                            "amount_paid": float(tx.amount_paid),
                            "status": tx.status,
                            "created_at": tx.created_at,
                        }
                        for tx in transactions
                    ],
                },
            )
        )

    def _recent_activity(self, student, course_id_strs):
        from apps.learning.models import UserActivity
        from apps.courses.models import Lesson, Course

        activities = UserActivity.objects.filter(
            user=student, metadata__course_id__in=course_id_strs
        )[:20]
        lesson_ids = {
            str(a.metadata.get("lesson_id"))
            for a in activities
            if a.metadata.get("lesson_id")
        }
        lesson_titles = {
            str(l.id): l.title
            for l in Lesson.objects.filter(id__in=[i for i in lesson_ids if i])
        }
        course_titles = {
            str(c.id): c.title for c in Course.objects.filter(id__in=course_id_strs)
        }
        return [
            {
                "kind": a.kind,
                "created_at": a.created_at,
                "course_title": course_titles.get(str(a.metadata.get("course_id")), ""),
                "lesson_title": lesson_titles.get(str(a.metadata.get("lesson_id")), ""),
            }
            for a in activities
        ]

    def _streak_days(self, student):
        from datetime import datetime, timedelta
        from django.utils import timezone
        from apps.learning.models import UserActivity

        streak = 0
        check = timezone.now().date()
        while True:
            start = timezone.make_aware(datetime.combine(check, datetime.min.time()))
            if UserActivity.objects.filter(user=student, created_at__gte=start).exists():
                streak += 1
                check -= timedelta(days=1)
            else:
                break
        return streak

    def _build_payload(self, student, enrollment_rows, stats, extra):
        return {
            "student": {
                "id": student.id,
                "full_name": student.full_name,
                "email": student.email,
                "avatar_url": student.avatar_url or "",
                "title": student.title or "",
                "bio": student.bio or "",
                "location": student.location or "",
                "website": student.website or "",
                "date_joined": student.date_joined,
                "last_seen": student.last_seen,
                "email_verified": student.email_verified,
                "is_active": student.is_active,
            },
            "stats": stats,
            "enrollments": enrollment_rows,
            **extra,
        }


class UploadImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".mp4", ".webm"}
    MAX_SIZE_MB = 50

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        import os
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {"error": f"File type '{ext}' is not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > self.MAX_SIZE_MB * 1024 * 1024:
            return Response(
                {"error": f"File must be smaller than {self.MAX_SIZE_MB}MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = f"uploads/{uuid.uuid4()}{ext}"
        path = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb+") as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        url = f"{settings.MEDIA_URL}{filename}"
        if request.build_absolute_uri:
            url = request.build_absolute_uri(url)
        return Response({"url": url}, status=status.HTTP_201_CREATED)


ALLOWED_ATTENDANCE_STATUSES = [
    AttendanceRecord.Status.PRESENT,
    AttendanceRecord.Status.LATE,
    AttendanceRecord.Status.ABSENT,
    AttendanceRecord.Status.EXCUSED,
]


class UniversitySessionViewSet(viewsets.ModelViewSet):
    queryset = UniversitySession.objects.select_related("course", "created_by")
    serializer_class = UniversitySessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "session_type"]

    def _owns_course(self, course):
        return is_admin(self.request.user) or course.instructor_id == self.request.user.id

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(course__instructor=self.request.user)
        return qs.filter(course__enrollments__student=self.request.user, course__enrollments__is_active=True).distinct()

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not self._owns_course(course):
            raise PermissionDenied("Vous ne pouvez pas planifier de séance pour ce cours.")
        session = serializer.save(created_by=self.request.user)
        create_session_records(session)

    def perform_update(self, serializer):
        if not self._owns_course(serializer.instance.course):
            raise PermissionDenied("Vous ne pouvez pas modifier cette séance.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self._owns_course(instance.course):
            raise PermissionDenied("Vous ne pouvez pas supprimer cette séance.")
        instance.delete()

    @action(detail=True, methods=["get", "post"], url_path="attendance")
    def attendance(self, request, pk=None):
        session = self.get_object()
        if request.method == "POST":
            if not self._owns_course(session.course):
                raise PermissionDenied("Réservé à l'enseignant du cours.")
            payload = request.data.get("records") or []
            if not isinstance(payload, list):
                return Response({"detail": "records doit être une liste."}, status=status.HTTP_400_BAD_REQUEST)
            updated = []
            for item in payload:
                student_id = item.get("student_id")
                new_status = item.get("status")
                if not student_id or new_status not in ALLOWED_ATTENDANCE_STATUSES:
                    return Response(
                        {"detail": f"Statut invalide pour {student_id}: {new_status}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                record = session.records.filter(student_id=student_id).first()
                if record is None:
                    continue
                if record.status == AttendanceRecord.Status.EXCUSED and new_status != AttendanceRecord.Status.EXCUSED:
                    new_status = AttendanceRecord.Status.EXCUSED
                record.status = new_status
                record.save(update_fields=["status", "updated_at"])
                updated.append(record.id)
            return Response({"updated": len(updated)})
        records = session.records.select_related("student").all()
        return Response(AttendanceRecordSerializer(records, many=True).data)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related("session", "session__course", "student")
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["session", "student"]

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(session__course__instructor=self.request.user)
        return qs.filter(student=self.request.user)

    def create(self, request, *args, **kwargs):
        return Response({"detail": "Les fiches de présence sont créées lors de la planification des séances."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Utilisez l'action attendance de la séance."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Impossible de supprimer une fiche de présence."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["post"], url_path="justify")
    def justify(self, request, pk=None):
        record = self.get_object()
        if record.student_id != request.user.id:
            raise PermissionDenied("Vous ne pouvez justifier que vos propres absences.")
        if not can_justify(record):
            return Response(
                {"detail": "Justification impossible : délai de 48h dépassé ou absence non justifiable."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        justification = (request.data.get("justification") or "").strip()
        if not justification:
            return Response({"detail": "Une justification est requise."}, status=status.HTTP_400_BAD_REQUEST)
        record.justification = justification
        record.justification_status = AttendanceRecord.JustificationStatus.PENDING
        record.justification_submitted_at = timezone.now()
        record.save(
            update_fields=["justification", "justification_status", "justification_submitted_at", "updated_at"]
        )
        return Response(AttendanceRecordSerializer(record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        record = self.get_object()
        if not is_admin(request.user) and record.session.course.instructor_id != request.user.id:
            raise PermissionDenied("Réservé à l'enseignant du cours.")
        decision = request.data.get("decision")
        if decision not in {"APPROVE", "REJECT"}:
            return Response({"detail": "decision doit être APPROVE ou REJECT."}, status=status.HTTP_400_BAD_REQUEST)
        if record.justification_status != AttendanceRecord.JustificationStatus.PENDING:
            return Response({"detail": "Aucune justification en attente."}, status=status.HTTP_400_BAD_REQUEST)
        if decision == "APPROVE":
            record.status = AttendanceRecord.Status.EXCUSED
            record.justification_status = AttendanceRecord.JustificationStatus.APPROVED
        else:
            record.justification_status = AttendanceRecord.JustificationStatus.REJECTED
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()
        record.save(
            update_fields=["status", "justification_status", "reviewed_by", "reviewed_at", "updated_at"]
        )
        return Response(AttendanceRecordSerializer(record, context={"request": request}).data)


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.select_related("course", "quiz", "assignment")
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "kind"]

    def _owns_course(self, course):
        return is_admin(self.request.user) or course.instructor_id == self.request.user.id

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(course__instructor=self.request.user)
        return qs.filter(course__enrollments__student=self.request.user, course__enrollments__is_active=True).distinct()

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not self._owns_course(course):
            raise PermissionDenied("Vous ne pouvez pas ajouter d'évaluation pour ce cours.")
        evaluation = serializer.save(created_by=self.request.user)
        recompute_course_grades(course)

    def perform_update(self, serializer):
        if not self._owns_course(serializer.instance.course):
            raise PermissionDenied("Vous ne pouvez pas modifier cette évaluation.")
        evaluation = serializer.save()
        recompute_course_grades(evaluation.course)

    def perform_destroy(self, instance):
        if not self._owns_course(instance.course):
            raise PermissionDenied("Vous ne pouvez pas supprimer cette évaluation.")
        course = instance.course
        instance.delete()
        recompute_course_grades(course)


class EvaluationGradeViewSet(viewsets.ModelViewSet):
    queryset = EvaluationGrade.objects.select_related("evaluation", "evaluation__course", "enrollment", "enrollment__student")
    serializer_class = EvaluationGradeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["evaluation", "enrollment", "attempt"]

    def get_queryset(self):
        qs = self.queryset
        if is_admin(self.request.user):
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(evaluation__course__instructor=self.request.user)
        return qs.filter(enrollment__student=self.request.user)

    def perform_create(self, serializer):
        evaluation = serializer.validated_data["evaluation"]
        enrollment = serializer.validated_data["enrollment"]
        attempt = serializer.validated_data.get("attempt", 1)
        if not is_admin(self.request.user) and evaluation.course.instructor_id != self.request.user.id:
            raise PermissionDenied("Réservé à l'enseignant du cours.")
        if enrollment.course_id != evaluation.course_id:
            raise PermissionDenied("Cette inscription ne correspond pas au cours de l'évaluation.")
        try:
            instance = EvaluationGrade.objects.get(evaluation=evaluation, enrollment=enrollment, attempt=attempt)
        except EvaluationGrade.DoesNotExist:
            grade = serializer.save()
        else:
            grade = serializer.update(instance, serializer.validated_data)
        update_course_grade(enrollment, grade.attempt)

    def perform_update(self, serializer):
        if not is_admin(self.request.user) and serializer.instance.evaluation.course.instructor_id != self.request.user.id:
            raise PermissionDenied("Réservé à l'enseignant du cours.")
        serializer.save()
        update_course_grade(serializer.instance.enrollment, serializer.instance.attempt)


class CourseGradeSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Cours introuvable."}, status=status.HTTP_404_NOT_FOUND)

        can_view_all = is_admin(request.user) or course.instructor_id == request.user.id
        if can_view_all:
            enrollments = (
                course.enrollments.filter(is_active=True)
                .select_related("student", "course")
                .order_by("student__full_name")
            )
        else:
            enrollments = course.enrollments.filter(student=request.user, is_active=True)
            if not enrollments.exists():
                raise PermissionDenied("Vous n'êtes pas inscrit à ce cours.")

        students = []
        for enrollment in enrollments:
            update_course_grade(enrollment, 1)
            grade_1 = CourseGrade.objects.filter(enrollment=enrollment, attempt=1).first()
            grade_2 = CourseGrade.objects.filter(enrollment=enrollment, attempt=2).first()
            evaluations = []
            for item in eligible_evaluations(enrollment, 1):
                evaluation = item["evaluation"]
                evaluations.append(
                    {
                        "id": evaluation.id,
                        "title": evaluation.title,
                        "kind": evaluation.kind,
                        "coefficient": float(evaluation.coefficient or 1),
                        "note": item["note"],
                    }
                )
            students.append(
                {
                    "enrollment_id": enrollment.id,
                    "student_id": enrollment.student_id,
                    "student_name": enrollment.student.full_name,
                    "student_email": enrollment.student.email,
                    "attendance": attendance_summary(enrollment),
                    "attendance_rate": attendance_rate(enrollment),
                    "session_1": {
                        "average": float(grade_1.average) if grade_1 and grade_1.average is not None else None,
                        "decision": grade_1.decision if grade_1 else CourseGrade.Decision.PENDING,
                        "decision_display": grade_1.get_decision_display() if grade_1 else "En attente",
                        "credits_earned": grade_1.credits_earned if grade_1 else 0,
                    },
                    "session_2": {
                        "average": float(grade_2.average) if grade_2 and grade_2.average is not None else None,
                        "decision": grade_2.decision if grade_2 else CourseGrade.Decision.PENDING,
                        "decision_display": grade_2.get_decision_display() if grade_2 else "En attente",
                        "credits_earned": grade_2.credits_earned if grade_2 else 0,
                    },
                    "evaluations": evaluations,
                }
            )
        return Response({"course": {"id": course.id, "title": course.title, "credits": course.credits}, "students": students})


class CourseGradeDecideView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Cours introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if not is_admin(request.user) and course.instructor_id != request.user.id:
            raise PermissionDenied("Réservé à l'enseignant du cours.")

        enrollment_id = request.data.get("enrollment_id")
        attempt = int(request.data.get("attempt", 1))
        decision = request.data.get("decision")
        if not enrollment_id or attempt not in {1, 2}:
            return Response({"detail": "enrollment_id et attempt (1/2) sont requis."}, status=status.HTTP_400_BAD_REQUEST)
        valid_decisions = {c[0] for c in CourseGrade.Decision.choices}
        if decision not in valid_decisions:
            return Response({"detail": f"decision doit être l'une des valeurs : {valid_decisions}."}, status=status.HTTP_400_BAD_REQUEST)

        enrollment = course.enrollments.filter(id=enrollment_id, is_active=True).select_related("student").first()
        if enrollment is None:
            return Response({"detail": "Inscription introuvable."}, status=status.HTTP_404_NOT_FOUND)

        grade, _ = CourseGrade.objects.get_or_create(enrollment=enrollment, attempt=attempt)
        if attempt == 1 and decision in {CourseGrade.Decision.RATTRAPAGE, CourseGrade.Decision.REFUSE}:
            if grade.average is None:
                grade.average = compute_average(enrollment, 1)
            if grade.average is not None and grade.average >= 10 and decision != CourseGrade.Decision.PENDING:
                return Response(
                    {"detail": "Moyenne ≥ 10 : la délibération doit être ADMIS ou COMPENSE."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if attempt == 1 and decision in {CourseGrade.Decision.ADMIS, CourseGrade.Decision.COMPENSE} and grade.average is not None and grade.average < 10 and decision == CourseGrade.Decision.ADMIS:
            return Response(
                {"detail": "Moyenne < 10 : seule une décision COMPENSE est possible pour admettre."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        grade.decision = decision
        grade.decided_by = request.user
        grade.decided_at = timezone.now()
        grade.credits_earned = course.credits if decision in {CourseGrade.Decision.ADMIS, CourseGrade.Decision.COMPENSE} else 0
        grade.save(update_fields=["decision", "decided_by", "decided_at", "credits_earned"])
        return Response(
            {
                "enrollment_id": enrollment.id,
                "student_name": enrollment.student.full_name,
                "attempt": attempt,
                "decision": grade.decision,
                "average": float(grade.average) if grade.average is not None else None,
                "credits_earned": grade.credits_earned,
            },
            status=status.HTTP_200_OK,
        )


class CourseTranscriptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Cours introuvable."}, status=status.HTTP_404_NOT_FOUND)

        can_view_all = is_admin(request.user) or course.instructor_id == request.user.id
        filters = {"course": course, "is_active": True}
        if not can_view_all:
            filters["student"] = request.user
        enrollments = (
            course.enrollments.filter(**filters)
            .select_related("student")
            .order_by("student__full_name")
        )
        if not can_view_all and not enrollments.exists():
            raise PermissionDenied("Vous n'êtes pas inscrit à ce cours.")

        rows = []
        for enrollment in enrollments:
            update_course_grade(enrollment, 1)
            grade_1 = CourseGrade.objects.filter(enrollment=enrollment, attempt=1).first()
            grade_2 = CourseGrade.objects.filter(enrollment=enrollment, attempt=2).first()
            final_grade = {}
            if grade_2 and grade_2.decision != CourseGrade.Decision.PENDING:
                final_grade = {
                    "attempt": 2,
                    "average": float(grade_2.average) if grade_2.average is not None else None,
                    "decision": grade_2.decision,
                    "decision_display": grade_2.get_decision_display(),
                }
            elif grade_1 and grade_1.decision != CourseGrade.Decision.PENDING:
                final_grade = {
                    "attempt": 1,
                    "average": float(grade_1.average) if grade_1.average is not None else None,
                    "decision": grade_1.decision,
                    "decision_display": grade_1.get_decision_display(),
                }
            else:
                final_grade = {
                    "attempt": 1,
                    "average": float(grade_1.average) if grade_1 and grade_1.average is not None else None,
                    "decision": grade_1.decision if grade_1 else CourseGrade.Decision.PENDING,
                    "decision_display": grade_1.get_decision_display() if grade_1 else "En attente",
                }
            credits_earned = (grade_2.credits_earned if grade_2 else 0) or (grade_1.credits_earned if grade_1 else 0)

            evaluations = []
            for attempt in (1, 2):
                for item in eligible_evaluations(enrollment, attempt):
                    evaluation = item["evaluation"]
                    evaluations.append(
                        {
                            "id": evaluation.id,
                            "title": evaluation.title,
                            "kind": evaluation.kind,
                            "coefficient": float(evaluation.coefficient or 1),
                            "attempt": attempt,
                            "note": item["note"],
                            "has_grade": evaluation.grades.filter(enrollment=enrollment, attempt=attempt).exists(),
                        }
                    )

            rows.append(
                {
                    "enrollment_id": enrollment.id,
                    "student": can_view_all
                        and {
                            "id": enrollment.student_id,
                            "full_name": enrollment.student.full_name,
                            "email": enrollment.student.email,
                        }
                        or {"full_name": enrollment.student.full_name},
                    "attendance": attendance_summary(enrollment),
                    "attendance_rate": attendance_rate(enrollment),
                    "session_1": {
                        "average": float(grade_1.average) if grade_1 and grade_1.average is not None else None,
                        "decision": grade_1.decision if grade_1 else CourseGrade.Decision.PENDING,
                        "decision_display": grade_1.get_decision_display() if grade_1 else "En attente",
                    },
                    "session_2": {
                        "average": float(grade_2.average) if grade_2 and grade_2.average is not None else None,
                        "decision": grade_2.decision if grade_2 else CourseGrade.Decision.PENDING,
                        "decision_display": grade_2.get_decision_display() if grade_2 else "En attente",
                    },
                    "final": final_grade,
                    "credits_earned": credits_earned,
                    "evaluations": evaluations,
                }
            )

        return Response(
            {
                "course": {
                    "id": course.id,
                    "title": course.title,
                    "subtitle": course.subtitle,
                    "course_type": course.course_type,
                    "credits": course.credits,
                    "start_date": course.start_date,
                    "end_date": course.end_date,
                    "instructor_name": course.instructor.full_name,
                    "issued_at": timezone.now().date().isoformat(),
                },
                "rows": rows,
            }
        )
