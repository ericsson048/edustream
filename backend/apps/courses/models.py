import uuid

from django.conf import settings
from django.db import models
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


class Lesson(models.Model):
    class Type(models.TextChoices):
        VIDEO = "VIDEO", "Video"
        TEXT = "TEXT", "Text"
        QUIZ = "QUIZ", "Quiz"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"
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
