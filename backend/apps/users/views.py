from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "If that email exists, a reset link has been sent."})
        # In production, send a real email here.
        print(f"[FORGOT PASSWORD] Reset link for {user.email}: https://edustream.com/reset-password/{user.id}")
        return Response({"detail": "If that email exists, a reset link has been sent."})


class PublicStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from apps.courses.models import Course
        total_courses = Course.objects.filter(is_published=True).count()
        total_instructors = User.objects.filter(role="INSTRUCTOR", is_active=True).count()
        total_students = User.objects.filter(role="STUDENT", is_active=True).count()
        from apps.billing.models import Transaction
        from django.db.models import Sum
        earnings = Transaction.objects.filter(status="COMPLETED").aggregate(total=Sum("instructor_earning"))
        total_payouts = float(earnings["total"] or 0)
        return Response({
            "total_courses": total_courses,
            "total_instructors": total_instructors,
            "total_students": total_students,
            "total_payouts": total_payouts,
        })


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"


class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["role", "is_active"]
    search_fields = ["full_name", "email"]

    def get_queryset(self):
        if self.request.user.role != "ADMIN":
            return User.objects.filter(id=self.request.user.id)
        return super().get_queryset()
