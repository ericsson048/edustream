from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Assignment, FocusSession, Notification, Quiz, QuizAttempt, QuizQuestion, Skill, Submission, UserSkill
from .serializers import (
    AssignmentSerializer,
    FocusSessionSerializer,
    NotificationSerializer,
    QuizAttemptSerializer,
    QuizQuestionSerializer,
    QuizSerializer,
    SkillSerializer,
    SubmissionSerializer,
    UserSkillSerializer,
)
from apps.courses.models import Enrollment
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

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
