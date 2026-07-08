from django.urls import include, path
from rest_framework.routers import DefaultRouter

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssignmentViewSet,
    FocusSessionViewSet,
    NotificationViewSet,
    QuizAttemptViewSet,
    QuizQuestionViewSet,
    QuizViewSet,
    RecommendedCoursesView,
    SkillViewSet,
    SubmissionViewSet,
    UserActivityViewSet,
    UserSkillViewSet,
    UserStatsView,
)

router = DefaultRouter()
router.register(r"assignments", AssignmentViewSet, basename="assignment")
router.register(r"submissions", SubmissionViewSet, basename="submission")
router.register(r"quizzes", QuizViewSet, basename="quiz")
router.register(r"quiz-questions", QuizQuestionViewSet, basename="quiz-question")
router.register(r"quiz-attempts", QuizAttemptViewSet, basename="quiz-attempt")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"skills", SkillViewSet, basename="skill")
router.register(r"user-skills", UserSkillViewSet, basename="user-skill")
router.register(r"focus-sessions", FocusSessionViewSet, basename="focus-session")
router.register(r"activities", UserActivityViewSet, basename="activity")

urlpatterns = [
    path("", include(router.urls)),
    path("me/stats/", UserStatsView.as_view(), name="user-stats"),
    path("courses/recommended/", RecommendedCoursesView.as_view(), name="courses-recommended"),
]
