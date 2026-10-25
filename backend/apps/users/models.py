import hashlib
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class Institution(models.Model):
    """Represents a university or organization on the platform."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default="")
    logo_url = models.CharField(max_length=500, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    website = models.URLField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="institutions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base = slugify(self.name) or uuid.uuid4().hex[:8]
            slug = base
            n = 1
            while Institution.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        INSTRUCTOR = "INSTRUCTOR", "Instructor"
        INSTITUTION_ADMIN = "INSTITUTION_ADMIN", "Institution Admin"
        ADMIN = "ADMIN", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    institution = models.ForeignKey(
        Institution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    created_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_users",
    )
    must_change_password = models.BooleanField(
        default=False,
        help_text="Force password change on next login (set for accounts created by instructors/admins)",
    )
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(blank=True, default="")
    bio = models.TextField(blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    website = models.URLField(blank=True, default="")
    title = models.CharField(max_length=255, blank=True, default="", help_text="Professional headline (e.g. Senior Frontend Engineer & Educator)")
    is_active = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(blank=True, null=True)
    preferences = models.JSONField(default=dict, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class PasswordResetCode(models.Model):
    """One-time 6-digit code used to reset a user's password."""

    CODE_VALIDITY_MINUTES = 15
    MAX_ATTEMPTS = 5

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reset_code",
    )
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def generate_code():
        return f"{secrets.randbelow(10**6):06d}"

    @staticmethod
    def hash_code(code):
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def is_valid(self, code):
        return (
            not self.used
            and self.expires_at > timezone.now()
            and self.attempts < self.MAX_ATTEMPTS
            and secrets.compare_digest(self.otp_hash, self.hash_code(code))
        )
