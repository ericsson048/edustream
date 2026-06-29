from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Transaction
from apps.courses.models import Course, Enrollment
from apps.learning.models import Notification

from .models import PlatformSetting, SupportTicket
from .serializers import PlatformSettingSerializer, SupportTicketSerializer

User = get_user_model()


class AdminPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class DashboardStatsView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        now = timezone.now()
        total_users = User.objects.count()
        total_instructors = User.objects.filter(role="INSTRUCTOR").count()
        total_students = User.objects.filter(role="STUDENT").count()
        active_courses = Course.objects.filter(is_published=True).count()

        revenue_agg = Transaction.objects.filter(status=Transaction.Status.COMPLETED).aggregate(
            total=Sum("amount_paid"),
        )
        total_revenue = float(revenue_agg["total"] or 0)

        recent_activity = []
        recent_users = User.objects.order_by("-date_joined")[:5]
        for u in recent_users:
            recent_activity.append({
                "kind": "new_user",
                "description": f"New user registered: {u.email}",
                "timestamp": u.date_joined.isoformat(),
            })

        recent_courses = Course.objects.order_by("-created_at")[:5]
        for c in recent_courses:
            recent_activity.append({
                "kind": "course_published",
                "description": f"Course published: {c.title}",
                "timestamp": c.created_at.isoformat(),
            })

        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

        return Response({
            "total_users": total_users,
            "total_instructors": total_instructors,
            "total_students": total_students,
            "active_courses": active_courses,
            "total_revenue": total_revenue,
            "recent_activity": recent_activity[:10],
        })


class RevenueReportView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        months = int(request.query_params.get("months", 12))
        now = timezone.now()
        data = []
        for i in range(months - 1, -1, -1):
            first = now.replace(day=1) - timedelta(days=30 * i)
            if first.month == 12:
                last = first.replace(day=31)
            else:
                last = first.replace(month=first.month + 1, day=1) - timedelta(days=1)

            qs = Transaction.objects.filter(
                status=Transaction.Status.COMPLETED,
                created_at__gte=first,
                created_at__lte=last,
            )
            agg = qs.aggregate(
                revenue=Sum("amount_paid"),
                payouts=Sum("instructor_earning"),
            )
            data.append({
                "month": first.strftime("%b"),
                "revenue": float(agg["revenue"] or 0),
                "payouts": float(agg["payouts"] or 0),
            })

        totals = Transaction.objects.filter(status=Transaction.Status.COMPLETED).aggregate(
            total_revenue=Sum("amount_paid"),
            total_payouts=Sum("instructor_earning"),
            total_fees=Sum("platform_fee"),
        )
        total_revenue = float(totals["total_revenue"] or 0)
        total_payouts = float(totals["total_payouts"] or 0)
        total_fees = float(totals["total_fees"] or 0)
        margin = round((total_fees / total_revenue * 100), 1) if total_revenue else 0

        pending_payouts = float(
            Transaction.objects.filter(status=Transaction.Status.COMPLETED, instructor_earning__isnull=False)
            .aggregate(s=Sum("instructor_earning"))["s"] or 0
        )

        return Response({
            "monthly": data,
            "summary": {
                "total_revenue": total_revenue,
                "total_payouts": total_payouts,
                "platform_profit": total_fees,
                "margin": margin,
                "pending_payouts": pending_payouts,
            },
        })


class SupportTicketListCreateView(generics.ListCreateAPIView):
    permission_classes = [AdminPermission]
    queryset = SupportTicket.objects.select_related("user").all()
    serializer_class = SupportTicketSerializer
    filterset_fields = ["status", "priority"]
    search_fields = ["subject", "user__full_name", "user__email"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SupportTicketDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [AdminPermission]
    queryset = SupportTicket.objects.select_related("user").all()
    serializer_class = SupportTicketSerializer
    lookup_field = "pk"


class PlatformSettingListView(generics.ListCreateAPIView):
    permission_classes = [AdminPermission]
    queryset = PlatformSetting.objects.all()
    serializer_class = PlatformSettingSerializer


class PlatformSettingDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [AdminPermission]
    queryset = PlatformSetting.objects.all()
    serializer_class = PlatformSettingSerializer
    lookup_field = "key"
    lookup_url_kwarg = "key"
