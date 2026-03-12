import uuid

from django.conf import settings
from django.db import models

from apps.courses.models import Course


class SubscriptionPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stripe_price_id = models.CharField(max_length=255, blank=True)
    has_unlimited_ai = models.BooleanField(default=False)
    has_unlimited_streams = models.BooleanField(default=False)
    ai_monthly_limit = models.PositiveIntegerField(default=20)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class UserSubscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        CANCELED = "CANCELED", "Canceled"
        PAST_DUE = "PAST_DUE", "Past Due"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    ai_prompts_used_this_month = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class Transaction(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        REFUNDED = "REFUNDED", "Refunded"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="transactions")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)
    instructor_earning = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    created_at = models.DateTimeField(auto_now_add=True)
