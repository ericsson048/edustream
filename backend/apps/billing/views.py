import uuid
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course, Enrollment

from .models import SubscriptionPlan, Transaction, UserSubscription
from .serializers import SubscriptionPlanSerializer, TransactionSerializer, UserSubscriptionSerializer
from .services import compute_split


class PlanListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by("price_monthly")
        return Response(SubscriptionPlanSerializer(plans, many=True).data)


class SubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response({"detail": "plan_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Invalid plan."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        subscription, _ = UserSubscription.objects.update_or_create(
            user=request.user,
            defaults={
                "plan": plan,
                "status": UserSubscription.Status.ACTIVE,
                "current_period_start": now,
                "current_period_end": now + timedelta(days=30),
                "ai_prompts_used_this_month": 0,
            },
        )
        data = UserSubscriptionSerializer(subscription).data
        data["checkout_url"] = f"https://checkout.stripe.com/pay/mock-{uuid.uuid4()}"
        return Response(data, status=status.HTTP_201_CREATED)


class CourseCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response({"detail": "Already enrolled."}, status=status.HTTP_409_CONFLICT)

        fee, instructor_earning = compute_split(course.price, course.platform_fee_percentage)
        tx = Transaction.objects.create(
            student=request.user,
            course=course,
            amount_paid=course.price,
            platform_fee=fee,
            instructor_earning=instructor_earning,
            stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:12]}",
            status=Transaction.Status.COMPLETED,
        )
        Enrollment.objects.create(student=request.user, course=course)

        return Response(
            {
                "transaction": TransactionSerializer(tx).data,
                "checkout_url": f"https://checkout.stripe.com/pay/mock-{uuid.uuid4()}",
            },
            status=status.HTTP_201_CREATED,
        )


class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        event_type = request.data.get("type")
        user_id = request.data.get("user_id")
        if not event_type or not user_id:
            return Response({"detail": "type and user_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sub = UserSubscription.objects.get(user_id=user_id)
        except UserSubscription.DoesNotExist:
            return Response({"detail": "Subscription not found."}, status=status.HTTP_404_NOT_FOUND)

        if event_type == "invoice.payment_failed":
            sub.status = UserSubscription.Status.PAST_DUE
        elif event_type in {"customer.subscription.deleted", "customer.subscription.canceled"}:
            sub.status = UserSubscription.Status.CANCELED
        elif event_type in {"invoice.paid", "customer.subscription.updated"}:
            sub.status = UserSubscription.Status.ACTIVE
            sub.current_period_end = timezone.now() + timedelta(days=30)
        sub.save(update_fields=["status", "current_period_end", "updated_at"])
        return Response({"ok": True})


class InstructorEarningsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in {"INSTRUCTOR", "ADMIN"}:
            return Response({"detail": "Instructor access required."}, status=status.HTTP_403_FORBIDDEN)
        txs = Transaction.objects.filter(course__instructor=request.user, status=Transaction.Status.COMPLETED)
        totals = txs.aggregate(
            total_earned=Sum("instructor_earning"),
            total_revenue=Sum("amount_paid"),
            total_platform_fee=Sum("platform_fee"),
        )
        return Response(
            {
                "summary": totals,
                "transactions": TransactionSerializer(txs.order_by("-created_at")[:50], many=True).data,
            }
        )


class TransactionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.select_related("student", "course", "course__instructor").order_by("-created_at")
        if request.user.role == "ADMIN":
            data = TransactionSerializer(qs[:200], many=True).data
        elif request.user.role == "INSTRUCTOR":
            data = TransactionSerializer(qs.filter(course__instructor=request.user)[:200], many=True).data
        else:
            data = TransactionSerializer(qs.filter(student=request.user)[:200], many=True).data
        return Response(data)
