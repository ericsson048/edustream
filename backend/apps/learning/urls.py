from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssignmentViewSet,
    NotificationViewSet,
    QuizAttemptViewSet,
    QuizQuestionViewSet,
    QuizViewSet,
    SubmissionViewSet,
)

router = DefaultRouter()
router.register(r"assignments", AssignmentViewSet, basename="assignment")
router.register(r"submissions", SubmissionViewSet, basename="submission")
router.register(r"quizzes", QuizViewSet, basename="quiz")
router.register(r"quiz-questions", QuizQuestionViewSet, basename="quiz-question")
router.register(r"quiz-attempts", QuizAttemptViewSet, basename="quiz-attempt")
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
