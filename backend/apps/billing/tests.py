from datetime import timedelta
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.courses.models import Category, Course, Enrollment
from .models import SubscriptionPlan, Transaction, UserSubscription

User = get_user_model()


class BillingTests(APITestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            email="instructor@test.com",
            full_name="Test Instructor",
            password="password123",
            role="INSTRUCTOR",
        )
        self.student = User.objects.create_user(
            email="student@test.com",
            full_name="Test Student",
            password="password123",
            role="STUDENT",
        )

        # Create category and course
        self.category = Category.objects.create(name="Web Dev")
        self.course = Course.objects.create(
            title="React Basics",
            subtitle="Learn React",
            description="Detailed course description",
            category=self.category,
            price=100.00,
            platform_fee_percentage=30.00,
            is_published=True,
            instructor=self.instructor,
        )

        # Create SubscriptionPlan
        self.pro_plan = SubscriptionPlan.objects.create(
            name="Pro Plan",
            price_monthly=9.99,
            stripe_price_id="price_pro",
            badge="Most Popular",
            audience="STUDENT",
            has_unlimited_ai=False,
            ai_monthly_limit=50,
            is_active=True,
        )

        self.plans_url = reverse("billing-plans")
        self.subscribe_url = reverse("billing-subscribe")
        self.checkout_url = reverse("billing-checkout-course", kwargs={"course_id": self.course.id})
        self.webhook_url = reverse("billing-webhook")
        self.earnings_url = reverse("instructor-earnings")
        self.transactions_url = reverse("transactions-list")

    def test_list_plans(self):
        response = self.client.get(self.plans_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Pro Plan")

    def test_subscribe_plan(self):
        self.client.force_authenticate(user=self.student)
        data = {"plan_id": str(self.pro_plan.id)}
        response = self.client.post(self.subscribe_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserSubscription.objects.filter(user=self.student, plan=self.pro_plan).exists())

    @patch("stripe.checkout.Session.create")
    def test_course_checkout_split(self, mock_session_create):
        # Mock Stripe session return
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/pay/mock"
        mock_session.id = "cs_mock"
        mock_session_create.return_value = mock_session

        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.checkout_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify that either the stripe flow or mock flow was used.
        # If stripe flows, it returns checkout_url.
        self.assertIn("checkout_url", response.data)

        # Let's test the mock flow explicitly by setting stripe settings empty
        with patch("django.conf.settings.STRIPE_SECRET_KEY", ""):
            response = self.client.post(self.checkout_url)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            # Verify enrollment was created
            self.assertTrue(Enrollment.objects.filter(student=self.student, course=self.course).exists())
            
            # Verify transaction splits (platform 30% = 30, instructor 70% = 70)
            tx = Transaction.objects.filter(student=self.student, course=self.course).first()
            self.assertEqual(tx.amount_paid, 100.00)
            self.assertEqual(tx.platform_fee, 30.00)
            self.assertEqual(tx.instructor_earning, 70.00)

    def test_stripe_webhook_invoice_failed(self):
        # Setup initial subscription
        now = timezone.now()
        sub = UserSubscription.objects.create(
            user=self.student,
            plan=self.pro_plan,
            status=UserSubscription.Status.ACTIVE,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
        )

        data = {
            "type": "invoice.payment_failed",
            "user_id": str(self.student.id),
        }
        response = self.client.post(self.webhook_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, UserSubscription.Status.PAST_DUE)

    def test_stripe_webhook_subscription_canceled(self):
        now = timezone.now()
        sub = UserSubscription.objects.create(
            user=self.student,
            plan=self.pro_plan,
            status=UserSubscription.Status.ACTIVE,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
        )

        data = {
            "type": "customer.subscription.deleted",
            "user_id": str(self.student.id),
        }
        response = self.client.post(self.webhook_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, UserSubscription.Status.CANCELED)

    def test_stripe_webhook_invoice_paid(self):
        now = timezone.now()
        sub = UserSubscription.objects.create(
            user=self.student,
            plan=self.pro_plan,
            status=UserSubscription.Status.PAST_DUE,
            current_period_start=now - timedelta(days=5),
            current_period_end=now,
        )

        data = {
            "type": "invoice.paid",
            "user_id": str(self.student.id),
        }
        response = self.client.post(self.webhook_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, UserSubscription.Status.ACTIVE)
        self.assertTrue(sub.current_period_end > now + timedelta(days=29))

    def test_instructor_earnings(self):
        # Create a mock transaction for earnings view
        Transaction.objects.create(
            student=self.student,
            course=self.course,
            amount_paid=100.00,
            platform_fee=30.00,
            instructor_earning=70.00,
            status=Transaction.Status.COMPLETED,
        )

        # Authenticate as instructor
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(self.earnings_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_earned"], 70.00)
        self.assertEqual(response.data["summary"]["total_revenue"], 100.00)
        self.assertEqual(response.data["summary"]["total_platform_fee"], 30.00)
        self.assertEqual(len(response.data["transactions"]), 1)
