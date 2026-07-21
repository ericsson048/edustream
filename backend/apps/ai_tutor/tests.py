from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.billing.models import SubscriptionPlan, UserSubscription
from .models import AITutorConversation

User = get_user_model()


class AITutorTests(APITestCase):
    def setUp(self):
        # Create users
        self.student = User.objects.create_user(
            email="student@test.com",
            full_name="Test Student",
            password="password123",
            role="STUDENT",
        )
        self.instructor = User.objects.create_user(
            email="instructor@test.com",
            full_name="Test Instructor",
            password="password123",
            role="INSTRUCTOR",
        )

        # Create subscription plans
        self.limited_plan = SubscriptionPlan.objects.create(
            name="Limited Plan",
            price_monthly=4.99,
            has_unlimited_ai=False,
            ai_monthly_limit=2,
            is_active=True,
        )
        self.unlimited_plan = SubscriptionPlan.objects.create(
            name="Unlimited Plan",
            price_monthly=19.99,
            has_unlimited_ai=True,
            ai_monthly_limit=999,
            is_active=True,
        )

        self.chat_url = reverse("ai-tutor-chat")
        self.gen_course_url = reverse("ai-instructor-generate-course")

    def test_tutor_chat_no_subscription(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.chat_url, {"prompt": "Hello"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("No active subscription", response.data.get("detail", ""))

    @patch("apps.ai_tutor.views.ask_with_context")
    def test_tutor_chat_active_subscription_increments_limit(self, mock_ask):
        mock_ask.return_value = {
            "content": "Mocked AI Tutor response",
            "usage": {"prompt_tokens": 5, "completion_tokens": 10},
        }

        # Create active subscription with limited plan
        now = timezone.now()
        sub = UserSubscription.objects.create(
            user=self.student,
            plan=self.limited_plan,
            status=UserSubscription.Status.ACTIVE,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            ai_prompts_used_this_month=0,
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.chat_url, {"prompt": "Explain React"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["response"], "Mocked AI Tutor response")

        sub.refresh_from_db()
        self.assertEqual(sub.ai_prompts_used_this_month, 1)

    @patch("apps.ai_tutor.views.ask_with_context")
    def test_tutor_chat_active_subscription_quota_exceeded(self, mock_ask):
        # Create subscription with quota exceeded
        now = timezone.now()
        UserSubscription.objects.create(
            user=self.student,
            plan=self.limited_plan,
            status=UserSubscription.Status.ACTIVE,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            ai_prompts_used_this_month=2, # monthly limit is 2
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.chat_url, {"prompt": "Explain React"})
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn("Upgrade to Unlimited", response.data.get("detail", ""))

    @patch("apps.ai_tutor.views.ask_with_context")
    def test_tutor_chat_unlimited_plan_does_not_block(self, mock_ask):
        mock_ask.return_value = {
            "content": "Unlimited response",
            "usage": {},
        }

        now = timezone.now()
        UserSubscription.objects.create(
            user=self.student,
            plan=self.unlimited_plan,
            status=UserSubscription.Status.ACTIVE,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            ai_prompts_used_this_month=1000, # way over limit but plan has unlimited_ai = True
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.chat_url, {"prompt": "Explain Python"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_instructor_generate_course_role_restriction(self):
        # Student cannot call it
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.gen_course_url, {"prompt": "React"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Instructor with no subscription cannot call it
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(self.gen_course_url, {"prompt": "React"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Instructor with active subscription can call it (mock structure returned)
        now = timezone.now()
        UserSubscription.objects.create(
            user=self.instructor,
            plan=self.unlimited_plan,
            status=UserSubscription.Status.ACTIVE,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
        )
        response = self.client.post(self.gen_course_url, {"prompt": "React"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Applied Practice", str(response.data))
