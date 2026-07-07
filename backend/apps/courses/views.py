import uuid

from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from django.conf import settings

from django.db.models import Avg

from .models import (
    Category,
    Certificate,
    ContentBlock,
    Course,
    CourseReview,
    CourseVersion,
    Enrollment,
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
)
from .permissions import (
    IsInstructorOrReadOnly,
    IsInstructorOwnerOrAdmin,
    IsOwnerOrReadOnly,
    is_admin,
    owns_learning_object,
)
from .serializers import (
    CategorySerializer,
    CertificateSerializer,
    ContentBlockSerializer,
    CourseReviewSerializer,
    CourseSerializer,
    CourseVersionSerializer,
    EnrollmentSerializer,
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
        serializer.save(student=self.request.user)


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
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.select_related("course").all()
    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course"]

    def perform_create(self, serializer):
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
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course"]

    def get_queryset(self):
        return CourseReview.objects.select_related("user", "course").all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LessonCommentViewSet(viewsets.ModelViewSet):
    serializer_class = LessonCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["is_active"]
    search_fields = ["title", "description"]


class UploadImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        import uuid, os
        ext = os.path.splitext(file.name)[1]
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
