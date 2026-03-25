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


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = "BEGINNER", "Beginner"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED = "ADVANCED", "Advanced"
        ALL = "ALL", "All levels"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, max_length=280, blank=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses")
    language = models.CharField(max_length=16, default="en")
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.ALL)
    thumbnail_url = models.URLField(blank=True)
    thumbnail_file = models.ImageField(upload_to="courses/", blank=True, null=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)
    target_audience = models.JSONField(default=list, blank=True)
    estimated_hours = models.PositiveIntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    is_published = models.BooleanField(default=False)
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


class Module(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    estimated_minutes = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
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
    content = models.TextField(blank=True)
    lesson_type = models.CharField(max_length=20, choices=Type.choices, default=Type.VIDEO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    video_url = models.URLField(blank=True)
    video_file = models.FileField(upload_to="lessons/videos/", blank=True, null=True)
    transcript = models.TextField(blank=True)
    instructor_notes = models.TextField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=1)
    is_preview = models.BooleanField(default=False)

    class Meta:
        ordering = ["module__order", "order"]
        unique_together = ("module", "order")

    def __str__(self):
        return f"{self.module.title} / {self.title}"


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
