from django.utils import timezone
from rest_framework import serializers

from .models import Assignment, Notification, Quiz, QuizAttempt, QuizQuestion, Submission


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = "__all__"
        read_only_fields = ["created_by"]


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = "__all__"
        read_only_fields = ["student", "grade", "feedback", "status"]


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = "__all__"


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = "__all__"
        read_only_fields = ["created_by"]


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = "__all__"
        read_only_fields = ["student", "score", "passed", "submitted_at"]

    def create(self, validated_data):
        quiz = validated_data["quiz"]
        answers = validated_data.get("answers", {})
        total_questions = quiz.questions.count() or 1
        correct = 0
        for question in quiz.questions.all():
            if str(answers.get(str(question.id))) == str(question.correct_index):
                correct += 1
        score = round((correct / total_questions) * 100, 2)
        validated_data["score"] = score
        validated_data["passed"] = score >= quiz.passing_score
        validated_data["submitted_at"] = timezone.now()
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user"]
