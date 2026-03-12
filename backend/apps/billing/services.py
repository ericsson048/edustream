from decimal import Decimal

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


def can_stream_live(user):
    sub = getattr(user, "subscription", None)
    if not sub:
        return False
    return sub.status == UserSubscription.Status.ACTIVE and sub.plan.has_unlimited_streams


def compute_split(amount, fee_percent):
    amount = Decimal(amount)
    fee = (amount * Decimal(fee_percent) / Decimal("100")).quantize(Decimal("0.01"))
    instructor = (amount - fee).quantize(Decimal("0.01"))
    return fee, instructor
