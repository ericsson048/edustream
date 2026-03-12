from rest_framework import permissions, viewsets

from .models import Assignment, Notification, Quiz, QuizAttempt, QuizQuestion, Submission
from .serializers import (
    AssignmentSerializer,
    NotificationSerializer,
    QuizAttemptSerializer,
    QuizQuestionSerializer,
    QuizSerializer,
    SubmissionSerializer,
)


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.select_related("course", "created_by")
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "type"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["assignment", "status"]

    def get_queryset(self):
        qs = Submission.objects.select_related("assignment", "student")
        if self.request.user.role in {"INSTRUCTOR", "ADMIN"}:
            return qs
        return qs.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.select_related("lesson", "created_by")
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["lesson"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuizQuestionViewSet(viewsets.ModelViewSet):
    queryset = QuizQuestion.objects.select_related("quiz")
    serializer_class = QuizQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["quiz"]


class QuizAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["quiz", "passed"]

    def get_queryset(self):
        qs = QuizAttempt.objects.select_related("quiz", "student")
        if self.request.user.role in {"INSTRUCTOR", "ADMIN"}:
            return qs
        return qs.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
