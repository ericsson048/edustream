from django.core.management.base import BaseCommand

from apps.billing.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Seed default subscription plans (Free, Pro, Unlimited)"

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Free",
                "price_monthly": 0,
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "ai_monthly_limit": 20,
            },
            {
                "name": "Pro",
                "price_monthly": 19.99,
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "ai_monthly_limit": 200,
            },
            {
                "name": "Unlimited",
                "price_monthly": 49.99,
                "has_unlimited_ai": True,
                "has_unlimited_streams": True,
                "ai_monthly_limit": 0,
            },
        ]
        for plan_data in plans:
            SubscriptionPlan.objects.update_or_create(name=plan_data["name"], defaults=plan_data)
        self.stdout.write(self.style.SUCCESS("Subscription plans seeded successfully."))
