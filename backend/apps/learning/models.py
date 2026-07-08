import uuid

from django.conf import settings
from django.db import models

from apps.courses.models import Course, Lesson, Module


class Assignment(models.Model):
    class Type(models.TextChoices):
        QUIZ = "QUIZ", "Quiz"
        PROJECT = "PROJECT", "Project"
        ESSAY = "ESSAY", "Essay"
        REPORT = "REPORT", "Report"
        CODE = "CODE", "Code"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="assignments")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    points = models.PositiveIntegerField(default=100)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.PROJECT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignments_created")
    created_at = models.DateTimeField(auto_now_add=True)


class Submission(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        GRADED = "GRADED", "Graded"
        MISSING = "MISSING", "Missing"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions")
    content_text = models.TextField(blank=True)
    file_url = models.URLField(blank=True)
    grade = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    feedback = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("assignment", "student")


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name="quiz", null=True, blank=True)
    module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name="module_quiz", null=True, blank=True)
    title = models.CharField(max_length=255)
    passing_score = models.PositiveIntegerField(default=70)
    time_limit_minutes = models.PositiveIntegerField(default=15)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quizzes_created")
    created_at = models.DateTimeField(auto_now_add=True)


class QuizQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    options = models.JSONField(default=list)
    correct_index = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order"]


class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts")
    answers = models.JSONField(default=dict)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(blank=True, null=True)


class Skill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=50, blank=True, default="")
    position_x = models.FloatField(default=50)
    position_y = models.FloatField(default=10)
    order = models.IntegerField(default=0)
    related_courses = models.ManyToManyField("courses.Course", blank=True, related_name="skills")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]


class UserSkill(models.Model):
    class Status(models.TextChoices):
        LOCKED = "LOCKED", "Locked"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="user_skills")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LOCKED)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ("user", "skill")


class FocusSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="focus_sessions")
    duration_seconds = models.PositiveIntegerField()
    mode = models.CharField(max_length=10, choices=[("WORK", "Work"), ("BREAK", "Break")])
    completed_at = models.DateTimeField(auto_now_add=True)


class UserActivity(models.Model):
    class Kind(models.TextChoices):
        LESSON_STARTED = "LESSON_STARTED", "Lesson started"
        LESSON_COMPLETED = "LESSON_COMPLETED", "Lesson completed"
        QUIZ_STARTED = "QUIZ_STARTED", "Quiz started"
        QUIZ_PASSED = "QUIZ_PASSED", "Quiz passed"
        QUIZ_FAILED = "QUIZ_FAILED", "Quiz failed"
        COURSE_ENROLLED = "COURSE_ENROLLED", "Course enrolled"
        COURSE_COMPLETED = "COURSE_COMPLETED", "Course completed"
        CERTIFICATE_CLAIMED = "CERTIFICATE_CLAIMED", "Certificate claimed"
        NOTE_CREATED = "NOTE_CREATED", "Note created"
        ASSIGNMENT_SUBMITTED = "ASSIGNMENT_SUBMITTED", "Assignment submitted"
        FOCUS_SESSION = "FOCUS_SESSION", "Focus session completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activities")
    kind = models.CharField(max_length=30, choices=Kind.choices)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name_plural = "user activities"
        ordering = ["-created_at"]


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
