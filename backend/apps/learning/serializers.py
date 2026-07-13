from django.utils import timezone
from rest_framework import serializers

from .models import Assignment, FocusSession, Notification, Quiz, QuizAttempt, QuizQuestion, Skill, SkillEdge, SkillNode, SkillTree, Submission, UserActivity, UserSkill


class AssignmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Assignment
        fields = "__all__"
        read_only_fields = ["created_by"]


class SubmissionSerializer(serializers.ModelSerializer):
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    course_id = serializers.UUIDField(source="assignment.course_id", read_only=True)
    course_title = serializers.CharField(source="assignment.course.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

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
    course_id = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = "__all__"
        read_only_fields = ["created_by"]

    def get_course_id(self, obj):
        if obj.module_id:
            return str(obj.module.course_id)
        if obj.lesson_id:
            return str(obj.lesson.module.course_id)
        return None


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


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = "__all__"


class UserSkillSerializer(serializers.ModelSerializer):
    skill_title = serializers.CharField(source="skill.title", read_only=True)
    skill_position_x = serializers.FloatField(source="skill.position_x", read_only=True)
    skill_position_y = serializers.FloatField(source="skill.position_y", read_only=True)

    class Meta:
        model = UserSkill
        fields = "__all__"
        read_only_fields = ["user"]


class FocusSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusSession
        fields = "__all__"
        read_only_fields = ["user", "completed_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user"]


class UserActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActivity
        fields = "__all__"
        read_only_fields = ["user"]


class UserStatsSerializer(serializers.Serializer):
    courses_in_progress = serializers.IntegerField()
    courses_completed = serializers.IntegerField()
    lessons_completed = serializers.IntegerField()
    lessons_completed_today = serializers.IntegerField()
    streak_days = serializers.IntegerField()
    total_focus_minutes = serializers.IntegerField()
    average_quiz_score = serializers.FloatField()
    total_ai_tokens_used = serializers.IntegerField()
    skills_earned = serializers.ListField(child=serializers.CharField())
    last_activity = serializers.DateTimeField(allow_null=True)


class SkillNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillNode
        fields = "__all__"
        read_only_fields = ["skill_tree", "status", "completed_at"]


class SkillEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillEdge
        fields = "__all__"
        read_only_fields = ["skill_tree"]


class SkillTreeSerializer(serializers.ModelSerializer):
    nodes = SkillNodeSerializer(many=True, read_only=True)
    edges = SkillEdgeSerializer(many=True, read_only=True)

    class Meta:
        model = SkillTree
        fields = "__all__"
        read_only_fields = ["user"]


class RecommendedCourseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    slug = serializers.SlugField()
    thumbnail_url = serializers.URLField(allow_blank=True)
    category_name = serializers.CharField(allow_null=True)
    level = serializers.CharField()
    estimated_hours = serializers.IntegerField(allow_null=True)
    average_rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    enrolled_count = serializers.IntegerField()
    reason = serializers.CharField()
