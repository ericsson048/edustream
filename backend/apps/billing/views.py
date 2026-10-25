import uuid
from datetime import timedelta
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
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


class AdminPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = SubscriptionPlan.objects.all().order_by("price_monthly")
    serializer_class = SubscriptionPlanSerializer

    def get_queryset(self):
        if self.request.user.role != "ADMIN":
            return SubscriptionPlan.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        if self.request.user.role != "ADMIN":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin access required.")
        serializer.save()


class AdminPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    lookup_field = "pk"

    def get_queryset(self):
        if self.request.user.role != "ADMIN":
            return SubscriptionPlan.objects.none()
        return super().get_queryset()


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

        role_map = {"STUDENT": "STUDENT", "INSTRUCTOR": "INSTRUCTOR", "ADMIN": "INSTRUCTOR"}
        if plan.audience != role_map.get(request.user.role, "STUDENT"):
            return Response({"detail": "This plan is not available for your role."}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        subscription, _ = UserSubscription.objects.update_or_create(
            user=request.user,
            defaults={
                "plan": plan,
                "status": UserSubscription.Status.ACTIVE,
                "current_period_start": now,
                "current_period_end": now + timedelta(days=30),
                "ai_prompts_used_this_month": 0,
                "stream_minutes_used_this_month": 0,
            },
        )
        data = UserSubscriptionSerializer(subscription).data
        data["checkout_url"] = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/subscription/checkout?plan_id={plan.id}"
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

        if not settings.ENABLE_MOCK_PAYMENTS:
            return Response(
                {"detail": "Payments are not configured on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
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
        payload = request.body
        sig_header = request.headers.get("Stripe-Signature", "")
        if not settings.STRIPE_WEBHOOK_SECRET:
            return Response(
                {"detail": "Stripe webhook is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except ValueError:
            return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        event_data = event.to_dict_recursive()
        event_type = event_data.get("type")
        event_object = (event_data.get("data") or {}).get("object") or {}
        metadata = event_object.get("metadata") or {}

        if event_type == "checkout.session.completed":
            if metadata.get("type") != "course_checkout" or event_object.get("payment_status") != "paid":
                return Response({"ok": True, "ignored": True})
            user_id = metadata.get("user_id") or event_object.get("client_reference_id")
            course_id = metadata.get("course_id")
            if not user_id or not course_id:
                return Response({"detail": "Checkout metadata is incomplete."}, status=status.HTTP_400_BAD_REQUEST)
            course = Course.objects.filter(id=course_id, is_published=True).first()
            if not course:
                return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.filter(pk=user_id, is_active=True).first()
            if not user:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            payment_intent = event_object.get("payment_intent") or ""
            amount_paid = Decimal(event_object.get("amount_total") or 0) / Decimal("100")
            if amount_paid <= 0:
                return Response({"detail": "Checkout has no paid amount."}, status=status.HTTP_400_BAD_REQUEST)
            with db_transaction.atomic():
                enrollment, created = Enrollment.objects.get_or_create(student=user, course=course)
                if created:
                    fee, instructor_earning = compute_split(amount_paid, course.platform_fee_percentage)
                    Transaction.objects.get_or_create(
                        student=user,
                        course=course,
                        stripe_payment_intent_id=payment_intent,
                        defaults={
                            "amount_paid": amount_paid,
                            "platform_fee": fee,
                            "instructor_earning": instructor_earning,
                            "status": Transaction.Status.COMPLETED,
                        },
                    )
            return Response({"ok": True})

        if event_type not in {
            "invoice.payment_failed",
            "invoice.paid",
            "customer.subscription.deleted",
            "customer.subscription.updated",
        }:
            return Response({"ok": True, "ignored": True})

        user_id = metadata.get("user_id")
        customer_id = event_object.get("customer")
        subscription_query = UserSubscription.objects.all()
        if user_id:
            subscription_query = subscription_query.filter(user_id=user_id)
        elif customer_id:
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.filter(stripe_customer_id=customer_id).first()
            if not user:
                return Response({"ok": True, "ignored": True})
            subscription_query = subscription_query.filter(user=user)
        else:
            return Response({"ok": True, "ignored": True})

        sub = subscription_query.first()
        if not sub:
            return Response({"ok": True, "ignored": True})
        if event_type == "invoice.payment_failed":
            sub.status = UserSubscription.Status.PAST_DUE
        elif event_type == "customer.subscription.deleted":
            sub.status = UserSubscription.Status.CANCELED
        else:
            sub.status = UserSubscription.Status.ACTIVE
            period_end = event_object.get("current_period_end")
            if not period_end:
                lines = (event_object.get("lines") or {}).get("data") or []
                period_end = (lines[0].get("period") or {}).get("end") if lines else None
            if period_end:
                from datetime import datetime, timezone as datetime_timezone

                sub.current_period_end = datetime.fromtimestamp(period_end, tz=datetime_timezone.utc)
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
        elif request.user.role == "INSTITUTION_ADMIN":
            if request.user.institution_id:
                scoped = qs.filter(course__institution_id=request.user.institution_id)[:200]
            else:
                scoped = qs.none()
            data = TransactionSerializer(scoped, many=True).data
        elif request.user.role == "INSTRUCTOR":
            data = TransactionSerializer(qs.filter(course__instructor=request.user)[:200], many=True).data
        else:
            data = TransactionSerializer(qs.filter(student=request.user)[:200], many=True).data
        return Response(data)


class TransactionRefundView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "ADMIN":
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        try:
            tx = Transaction.objects.get(pk=pk, status=Transaction.Status.COMPLETED)
        except Transaction.DoesNotExist:
            return Response({"detail": "Transaction not found or already refunded."}, status=status.HTTP_404_NOT_FOUND)

        tx.status = Transaction.Status.REFUNDED
        tx.save(update_fields=["status"])

        Enrollment.objects.filter(student=tx.student, course=tx.course).update(is_active=False)

        return Response({"detail": "Transaction refunded."})


class MySubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sub = getattr(request.user, "subscription", None)
        if not sub:
            return Response({"detail": "No subscription."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSubscriptionSerializer(sub).data)
