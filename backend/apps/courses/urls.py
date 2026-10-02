from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceRecordViewSet,
    CategoryViewSet,
    CertificateViewSet,
    ContentBlockViewSet,
    CourseGradeDecideView,
    CourseGradeSummaryView,
    CourseReviewViewSet,
    CourseStudentDetailView,
    CourseStudentsOverviewView,
    CourseTranscriptView,
    CourseVersionViewSet,
    CourseViewSet,
    EnrollmentViewSet,
    EvaluationGradeViewSet,
    EvaluationViewSet,
    LearningPathViewSet,
    LessonCommentViewSet,
    LessonViewSet,
    ModuleViewSet,
    NoteViewSet,
    ProgressViewSet,
    ResourceViewSet,
    SectionViewSet,
    TagViewSet,
    UniversitySessionViewSet,
    UploadImageView,
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
router.register(r"university-sessions", UniversitySessionViewSet, basename="university-session")
router.register(r"attendance-records", AttendanceRecordViewSet, basename="attendance-record")
router.register(r"evaluations", EvaluationViewSet, basename="evaluation")
router.register(r"evaluation-grades", EvaluationGradeViewSet, basename="evaluation-grade")

urlpatterns = [
    path("", include(router.urls)),
    path("students-overview/", CourseStudentsOverviewView.as_view(), name="students-overview"),
    path("students/<uuid:pk>/", CourseStudentDetailView.as_view(), name="student-detail"),
    path("upload-image/", UploadImageView.as_view(), name="upload-image"),
    path("course-grades/<uuid:course_id>/", CourseGradeSummaryView.as_view(), name="course-grades-summary"),
    path("course-grades/<uuid:course_id>/decide/", CourseGradeDecideView.as_view(), name="course-grades-decide"),
    path("course-transcript/<uuid:course_id>/", CourseTranscriptView.as_view(), name="course-transcript"),
]
