import random
import string
import uuid
from datetime import UTC, datetime

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def build_unique_slug(model, value, instance_id=None):
    base_slug = slugify(value) or uuid.uuid4().hex[:8]
    slug = base_slug
    suffix = 1
    while model.objects.filter(slug=slug).exclude(id=instance_id).exists():
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, max_length=60, blank=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True, max_length=140, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class LearningPath(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    thumbnail_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class PathCourse(models.Model):
    path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name="path_courses")
    course = models.ForeignKey("Course", on_delete=models.CASCADE, related_name="learning_paths")
    order = models.PositiveIntegerField(default=1)
    is_required = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("path", "course")


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = "BEGINNER", "Beginner"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED = "ADVANCED", "Advanced"
        ALL = "ALL", "All levels"

    class CompletionCriteria(models.TextChoices):
        ALL_LESSONS = "ALL_LESSONS", "All lessons watched"
        ALL_QUIZZES = "ALL_QUIZZES", "All quizzes passed"
        FINAL_EXAM = "FINAL_EXAM", "Final exam only"
        MANUAL = "MANUAL", "Manual by instructor"

    class CourseType(models.TextChoices):
        REGULAR = "REGULAR", "Cours du programme"
        MARGINAL = "MARGINAL", "Cours marginal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, max_length=280, blank=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses")
    tags = models.ManyToManyField(Tag, blank=True, related_name="courses")
    language = models.CharField(max_length=16, default="en")
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.ALL)
    thumbnail_url = models.URLField(blank=True)
    thumbnail_file = models.ImageField(upload_to="courses/", blank=True, null=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)
    target_audience = models.JSONField(default=list, blank=True)
    estimated_hours = models.PositiveIntegerField(default=0)
    hours_for_certificate = models.PositiveIntegerField(default=0, help_text="Minimum hours required for certificate")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    is_published = models.BooleanField(default=False)
    course_type = models.CharField(
        max_length=20, choices=CourseType.choices, default=CourseType.REGULAR
    )
    start_date = models.DateField(null=True, blank=True, help_text="Début de la période (cours marginal)")
    end_date = models.DateField(null=True, blank=True, help_text="Fin de la période (cours marginal)")
    credits = models.PositiveSmallIntegerField(default=0, help_text="Crédits ECTS attribués à la validation du cours")
    completion_criteria = models.CharField(
        max_length=20, choices=CompletionCriteria.choices, default=CompletionCriteria.ALL_LESSONS
    )
    passing_score_percent = models.PositiveIntegerField(default=80)
    certificate_template = models.JSONField(default=dict, blank=True)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses_taught",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = build_unique_slug(Course, self.title, self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Section(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order"]
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.title} / {self.title}"


class Module(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name="modules")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    estimated_minutes = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    require_quiz_pass_to_continue = models.BooleanField(default=False)
    prerequisite_modules = models.ManyToManyField("self", blank=True, symmetrical=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order"]
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.title} / {self.title}"

    def is_completed_by(self, user_id):
        from django.db.models import Count, Q
        published = self.lessons.filter(status=Lesson.Status.PUBLISHED)
        total = published.count()
        if total == 0:
            return True
        completed = published.filter(
            progress_items__enrollment__student_id=user_id,
            progress_items__is_completed=True,
        ).count()
        return completed >= total

    def is_quiz_passed_by(self, user_id):
        try:
            quiz = self.module_quiz
        except Exception:
            return None
        if quiz is None:
            return None
        from apps.learning.models import QuizAttempt
        return QuizAttempt.objects.filter(quiz=quiz, student_id=user_id, passed=True).exists()


class Lesson(models.Model):
    class Type(models.TextChoices):
        VIDEO = "VIDEO", "Video"
        TEXT = "TEXT", "Text"
        QUIZ = "QUIZ", "Quiz"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"
        DEVOIR = "DEVOIR", "Devoir"
        LIVE = "LIVE", "Live"
        DOWNLOAD = "DOWNLOAD", "Download"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, help_text="Legacy HTML content — use ContentBlocks instead")
    lesson_type = models.CharField(max_length=20, choices=Type.choices, default=Type.VIDEO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    video_url = models.URLField(blank=True)
    video_file = models.FileField(upload_to="lessons/videos/", blank=True, null=True)
    transcript = models.TextField(blank=True)
    instructor_notes = models.TextField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=1)
    is_preview = models.BooleanField(default=False)
    ai_generated = models.BooleanField(default=False)
    ai_prompt_used = models.TextField(blank=True)

    class Meta:
        ordering = ["module__order", "order"]
        unique_together = ("module", "order")

    def __str__(self):
        return f"{self.module.title} / {self.title}"


class ContentBlock(models.Model):
    class Kind(models.TextChoices):
        MARKDOWN = "MARKDOWN", "Markdown"
        TEXT = "TEXT", "Text"
        VIDEO = "VIDEO", "Video"
        CODE = "CODE", "Code"
        EMBED = "EMBED", "Embed"
        IMAGE = "IMAGE", "Image"
        FILE = "FILE", "Download"
        QUIZ = "QUIZ", "Quiz"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="content_blocks")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.MARKDOWN)
    data = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("lesson", "order")

    def __str__(self):
        return f"{self.get_kind_display()} block #{self.order}"


class Resource(models.Model):
    class Kind(models.TextChoices):
        PDF = "PDF", "PDF"
        LINK = "LINK", "Link"
        ZIP = "ZIP", "Archive"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="resources")
    title = models.CharField(max_length=255)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.OTHER)
    description = models.TextField(blank=True)
    file_url = models.URLField(blank=True)
    file = models.FileField(upload_to="lessons/resources/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Enrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    invitation = models.ForeignKey(
        "CourseInvitation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments",
    )
    purchased_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("student", "course")


class Progress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="progress_items")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="progress_items")
    completion = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_completed = models.BooleanField(default=False)
    last_position_seconds = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("enrollment", "lesson")


class CourseReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_reviews")
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("course", "user")
        ordering = ["-created_at"]


class LessonComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_comments")
    content = models.TextField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class CourseVersion(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    snapshot = models.JSONField(default=dict, blank=True)
    changelog = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("course", "version_number")
        ordering = ["-version_number"]


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="notes")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="certificates")
    certificate_code = models.CharField(max_length=64, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "course")


class CourseInvitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="invitations")
    code = models.CharField(max_length=20, unique=True, editable=False)
    max_uses = models.PositiveIntegerField(default=0, help_text="0 = nombre d'utilisations illimité")
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_invitations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.course.title} / {self.code}"


class UniversitySession(models.Model):
    class Type(models.TextChoices):
        CM = "CM", "Cours magistral"
        TD = "TD", "Travaux dirigés"
        TP = "TP", "Travaux pratiques"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="university_sessions")
    title = models.CharField(max_length=255, blank=True)
    session_type = models.CharField(max_length=10, choices=Type.choices, default=Type.CM)
    date = models.DateField()
    start_time = models.TimeField(default="09:00:00")
    end_time = models.TimeField(default="11:00:00")
    location = models.CharField(max_length=255, blank=True)
    is_cancelled = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="university_sessions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "start_time"]
        indexes = [models.Index(fields=["course", "date"])]

    def __str__(self):
        return f"{self.course.title} / {self.session_type} {self.date}"


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Présent"
        LATE = "LATE", "Retard"
        ABSENT = "ABSENT", "Absent"
        EXCUSED = "EXCUSED", "Excusé"

    class JustificationStatus(models.TextChoices):
        NONE = "NONE", "Aucune"
        PENDING = "PENDING", "En attente"
        APPROVED = "APPROVED", "Approuvée"
        REJECTED = "REJECTED", "Rejetée"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(UniversitySession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABSENT)
    justification = models.TextField(blank=True)
    justification_status = models.CharField(
        max_length=20, choices=JustificationStatus.choices, default=JustificationStatus.NONE
    )
    justification_submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("session", "student")
        ordering = ["session__date", "session__start_time"]

    def __str__(self):
        return f"{self.student.full_name} / {self.session} / {self.status}"

    @property
    def session_end(self):
        return datetime.combine(self.session.date, self.session.end_time, tzinfo=UTC)


class Evaluation(models.Model):
    class Kind(models.TextChoices):
        CONTINUOUS = "CONTINUOUS", "Contrôle continu"
        EXAM = "EXAM", "Examen"
        ORAL = "ORAL", "Oral"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="evaluations")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.CONTINUOUS)
    title = models.CharField(max_length=255)
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    date = models.DateField(null=True, blank=True)
    assignment = models.ForeignKey(
        "learning.Assignment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluations",
    )
    quiz = models.ForeignKey(
        "learning.Quiz",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluations",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="evaluations_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "created_at"]

    def __str__(self):
        return f"{self.course.title} / {self.title}"


class EvaluationGrade(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="grades")
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="evaluation_grades")
    attempt = models.PositiveSmallIntegerField(default=1, help_text="1 = session 1, 2 = rattrapage")
    note = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Note sur 20")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("evaluation", "enrollment", "attempt")

    def __str__(self):
        return f"{self.evaluation.title} / {self.enrollment.student.full_name} / {self.note}"


class CourseGrade(models.Model):
    class Decision(models.TextChoices):
        PENDING = "PENDING", "En attente de délibération"
        ADMIS = "ADMIS", "Admis"
        COMPENSE = "COMPENSE", "Admis par compensation"
        RATTRAPAGE = "RATTRAPAGE", "Rattrapage"
        REFUSE = "REFUSE", "Refusé"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="course_grades")
    attempt = models.PositiveSmallIntegerField(default=1, help_text="1 = session 1, 2 = rattrapage")
    average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Moyenne sur 20")
    decision = models.CharField(max_length=20, choices=Decision.choices, default=Decision.PENDING)
    credits_earned = models.PositiveSmallIntegerField(default=0)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="grades_decided",
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("enrollment", "attempt")
        ordering = ["-attempt"]

    def __str__(self):
        return f"{self.enrollment.student.full_name} / session {self.attempt} / {self.get_decision_display()}"


def generate_invitation_code():
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "EDU-" + "".join(random.choices(alphabet, k=6))
        if not CourseInvitation.objects.filter(code=code).exists():
            return code


def is_lesson_accessible(user_id, lesson):
    from apps.learning.models import QuizAttempt

    module = lesson.module
    course = module.course
    modules = list(course.modules.filter(is_published=True).order_by("order"))

    # Check 1: prerequisite_modules — each prerequisite must be fully completed
    prereq_ids = module.prerequisite_modules.values_list("id", flat=True)
    if prereq_ids:
        prereq_modules = [m for m in modules if m.id in prereq_ids]
        for pm in prereq_modules:
            if not pm.is_completed_by(user_id):
                return (False, "Prerequisite module not completed")

    # Check 2: chain gating — first module with require_quiz_pass_to_continue not passed
    first_blocked_order = None
    for m in modules:
        if m.require_quiz_pass_to_continue:
            passed = m.is_quiz_passed_by(user_id)
            if passed is None:
                continue
            if not passed:
                first_blocked_order = m.order
                break

    if first_blocked_order is not None and module.order > first_blocked_order:
        return (False, "Module quiz must be passed first")

    return (True, "")
