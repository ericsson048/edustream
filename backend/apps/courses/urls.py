from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificateViewSet,
    CourseViewSet,
    EnrollmentViewSet,
    LessonViewSet,
    ModuleViewSet,
    NoteViewSet,
    ProgressViewSet,
    ResourceViewSet,
)

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"modules", ModuleViewSet, basename="module")
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"resources", ResourceViewSet, basename="resource")
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")
router.register(r"progress", ProgressViewSet, basename="progress")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"certificates", CertificateViewSet, basename="certificate")

urlpatterns = [
    path("", include(router.urls)),
]
