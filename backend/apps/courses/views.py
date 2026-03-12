from rest_framework import permissions, viewsets

from .models import Certificate, Course, Enrollment, Lesson, Module, Note, Progress, Resource
from .permissions import IsInstructorOrReadOnly, IsOwnerOrReadOnly
from .serializers import (
    CertificateSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    LessonSerializer,
    ModuleSerializer,
    NoteSerializer,
    ProgressSerializer,
    ResourceSerializer,
)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("instructor").all()
    serializer_class = CourseSerializer
    permission_classes = [IsInstructorOrReadOnly]
    filterset_fields = ["category", "level", "instructor", "is_published"]
    search_fields = ["title", "description", "category"]
    ordering_fields = ["created_at", "price"]

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related("course").all()
    serializer_class = ModuleSerializer
    permission_classes = [IsInstructorOrReadOnly]
    filterset_fields = ["course"]


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related("module", "module__course").all()
    serializer_class = LessonSerializer
    permission_classes = [IsInstructorOrReadOnly]
    filterset_fields = ["module", "module__course"]


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related("lesson", "lesson__module").all()
    serializer_class = ResourceSerializer
    permission_classes = [IsInstructorOrReadOnly]
    filterset_fields = ["lesson"]


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "is_active"]

    def get_queryset(self):
        qs = Enrollment.objects.select_related("student", "course")
        if self.request.user.role == "ADMIN":
            return qs
        return qs.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["enrollment", "lesson", "is_completed"]

    def get_queryset(self):
        qs = Progress.objects.select_related("enrollment", "lesson")
        if self.request.user.role == "ADMIN":
            return qs
        return qs.filter(enrollment__student=self.request.user)


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ["lesson"]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).select_related("lesson")

    def perform_create(self, serializer):
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
