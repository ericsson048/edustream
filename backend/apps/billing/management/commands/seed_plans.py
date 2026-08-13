from django.core.management.base import BaseCommand

from apps.billing.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Seed default subscription plans (Free, Pro, Unlimited)"

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Free",
                "price_monthly": 0,
                "audience": "STUDENT",
                "badge": "",
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "stream_minutes_monthly": 0,
                "ai_monthly_limit": 20,
                "features": [
                    "Pay-per-course (only pay for the courses you buy)",
                    "Free community forum access",
                    "AI Tutor (20 prompts/month)",
                ],
            },
            {
                "name": "Pro",
                "price_monthly": 19.99,
                "audience": "STUDENT",
                "badge": "Most Popular",
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "stream_minutes_monthly": 500,
                "ai_monthly_limit": 200,
                "features": [
                    "Pay-per-course (only pay for the courses you buy)",
                    "Free community forum access",
                    "AI Tutor (200 prompts/month)",
                    "500 live stream minutes/month",
                    "Priority support",
                ],
            },
            {
                "name": "Unlimited",
                "price_monthly": 49.99,
                "audience": "STUDENT",
                "badge": "",
                "has_unlimited_ai": True,
                "has_unlimited_streams": True,
                "stream_minutes_monthly": 0,
                "ai_monthly_limit": 0,
                "features": [
                    "Pay-per-course (only pay for the courses you buy)",
                    "Free community forum access",
                    "Unlimited AI Tutor",
                    "Unlimited live streaming",
                    "Priority support",
                ],
            },
            {
                "name": "Instructor Free",
                "price_monthly": 0,
                "audience": "INSTRUCTOR",
                "badge": "",
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "stream_minutes_monthly": 0,
                "ai_monthly_limit": 50,
                "features": [
                    "Unlimited video hosting",
                    "Keep 70% of every enrollment",
                    "Free & paid courses",
                    "AI Tutor (50 prompts/month)",
                ],
            },
            {
                "name": "Instructor Pro",
                "price_monthly": 29.99,
                "audience": "INSTRUCTOR",
                "badge": "Most Popular",
                "has_unlimited_ai": True,
                "has_unlimited_streams": True,
                "stream_minutes_monthly": 0,
                "ai_monthly_limit": 0,
                "features": [
                    "Unlimited video hosting",
                    "Keep 70% of every enrollment",
                    "Free & paid courses",
                    "Unlimited AI Tutor",
                    "Unlimited live streaming",
                ],
            },
        ]
        for plan_data in plans:
            SubscriptionPlan.objects.update_or_create(name=plan_data["name"], defaults=plan_data)
        self.stdout.write(self.style.SUCCESS("Subscription plans seeded successfully."))
