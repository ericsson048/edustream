import uuid
from datetime import timedelta

import stripe
from django.conf import settings
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

        if not course.is_published:
            return Response({"detail": "This course is not available for checkout."}, status=status.HTTP_403_FORBIDDEN)

        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response({"detail": "Already enrolled."}, status=status.HTTP_409_CONFLICT)

        if settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            success_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/{course.id}?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/{course.id}?canceled=1"
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": "usd",
                            "unit_amount": int(course.price * 100),
                            "product_data": {
                                "name": course.title,
                                "description": course.subtitle or course.description[:200],
                            },
                        },
                        "quantity": 1,
                    }
                ],
                metadata={
                    "type": "course_checkout",
                    "course_id": str(course.id),
                    "user_id": str(request.user.id),
                },
                client_reference_id=str(request.user.id),
                success_url=success_url,
                cancel_url=cancel_url,
            )
            return Response(
                {
                    "checkout_url": session.url,
                    "session_id": session.id,
                    "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
                },
                status=status.HTTP_201_CREATED,
            )

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


class CourseCheckoutStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response({"detail": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.STRIPE_SECRET_KEY:
            return Response({"detail": "Stripe is not configured."}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)

        if session.metadata.get("type") != "course_checkout":
            return Response({"detail": "Unsupported checkout session."}, status=status.HTTP_400_BAD_REQUEST)
        if session.metadata.get("user_id") != str(request.user.id):
            return Response({"detail": "Session does not belong to this user."}, status=status.HTTP_403_FORBIDDEN)

        course_id = session.metadata.get("course_id")
        if not course_id:
            return Response({"detail": "Missing course metadata."}, status=status.HTTP_400_BAD_REQUEST)

        course = Course.objects.filter(id=course_id, is_published=True).first()
        if not course:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.payment_status != "paid":
            return Response(
                {"paid": False, "status": session.status, "payment_status": session.payment_status},
                status=status.HTTP_200_OK,
            )

        enrollment = Enrollment.objects.filter(student=request.user, course=course).first()
        transaction = Transaction.objects.filter(student=request.user, course=course, stripe_payment_intent_id=session.payment_intent or "").first()

        if not enrollment:
            fee, instructor_earning = compute_split(course.price, course.platform_fee_percentage)
            transaction = Transaction.objects.create(
                student=request.user,
                course=course,
                amount_paid=course.price,
                platform_fee=fee,
                instructor_earning=instructor_earning,
                stripe_payment_intent_id=session.payment_intent or "",
                status=Transaction.Status.COMPLETED,
            )
            enrollment = Enrollment.objects.create(student=request.user, course=course)

        return Response(
            {
                "paid": True,
                "transaction": TransactionSerializer(transaction).data if transaction else None,
                "enrollment_id": str(enrollment.id),
            }
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
