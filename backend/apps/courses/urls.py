from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    CertificateViewSet,
    ContentBlockViewSet,
    CourseReviewViewSet,
    CourseVersionViewSet,
    CourseViewSet,
    EnrollmentViewSet,
    LearningPathViewSet,
    LessonCommentViewSet,
    LessonViewSet,
    ModuleViewSet,
    NoteViewSet,
    ProgressViewSet,
    ResourceViewSet,
    SectionViewSet,
    TagViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"modules", ModuleViewSet, basename="module")
router.register(r"sections", SectionViewSet, basename="section")
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"resources", ResourceViewSet, basename="resource")
router.register(r"content-blocks", ContentBlockViewSet, basename="content-block")
router.register(r"tags", TagViewSet, basename="tag")
router.register(r"reviews", CourseReviewViewSet, basename="review")
router.register(r"lesson-comments", LessonCommentViewSet, basename="lesson-comment")
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")
router.register(r"progress", ProgressViewSet, basename="progress")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"certificates", CertificateViewSet, basename="certificate")
router.register(r"course-versions", CourseVersionViewSet, basename="course-version")
router.register(r"learning-paths", LearningPathViewSet, basename="learning-path")

urlpatterns = [
    path("", include(router.urls)),
]
