from decimal import Decimal

from django.db import models
from django.utils import timezone

from .models import UserSubscription


def has_active_subscription(user):
    sub = getattr(user, "subscription", None)
    if not sub:
        return False
    return sub.status == UserSubscription.Status.ACTIVE and sub.current_period_end >= timezone.now()


def can_use_ai(user):
    sub = getattr(user, "subscription", None)
    if not sub:
        return False, "No active subscription."
    if sub.status != UserSubscription.Status.ACTIVE:
        return False, "Subscription inactive."
    if sub.plan.has_unlimited_ai:
        return True, ""
    if sub.ai_prompts_used_this_month >= sub.plan.ai_monthly_limit:
        return False, "Upgrade to Unlimited."
    return True, ""


def can_stream_live(user, duration_minutes=0):
    sub = getattr(user, "subscription", None)
    if not sub:
        return False, "No active subscription."
    if sub.status != UserSubscription.Status.ACTIVE:
        return False, "Subscription inactive."
    if sub.plan.has_unlimited_streams:
        return True, ""
    plan_minutes = sub.plan.stream_minutes_monthly or 0
    if plan_minutes == 0:
        return False, "Your plan does not include live streaming."
    remaining = plan_minutes - sub.stream_minutes_used_this_month
    if remaining <= 0:
        return False, "Monthly streaming minutes exhausted. Upgrade your plan."
    if duration_minutes > remaining:
        return False, f"Only {remaining} streaming minutes remaining. Reduce duration or upgrade."
    return True, ""


def deduct_stream_minutes(user, minutes):
    sub = getattr(user, "subscription", None)
    if not sub:
        return
    if sub.plan.has_unlimited_streams:
        return
    sub.stream_minutes_used_this_month = models.F("stream_minutes_used_this_month") + minutes
    sub.save(update_fields=["stream_minutes_used_this_month"])
    sub.refresh_from_db(fields=["stream_minutes_used_this_month"])


def get_streaming_remaining(user):
    sub = getattr(user, "subscription", None)
    if not sub:
        return 0
    if sub.plan.has_unlimited_streams:
        return None  # unlimited
    plan_minutes = sub.plan.stream_minutes_monthly or 0
    remaining = plan_minutes - sub.stream_minutes_used_this_month
    return max(0, remaining)


def compute_split(amount, fee_percent):
    amount = Decimal(amount)
    fee = (amount * Decimal(fee_percent) / Decimal("100")).quantize(Decimal("0.01"))
    instructor = (amount - fee).quantize(Decimal("0.01"))
    return fee, instructor
