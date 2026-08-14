import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.views import TokenObtainPairView

from .emailing import send_template_email
from .models import PasswordResetCode
from .serializers import PublicUserSerializer, RegisterSerializer, UserSerializer

User = get_user_model()
logger = logging.getLogger("edustream.auth")


def _send_verification_email(user):
    token = default_token_generator.make_token(user)
    verify_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/verify-email/{user.pk}/{token}"
    subject = "Confirmez votre adresse email EduStream"
    plain_text = (
        f"Bonjour {user.full_name or user.email},\n\n"
        f"Merci de confirmer votre adresse email en cliquant sur le lien suivant :\n"
        f"{verify_url}\n\n"
        f"Ce lien est valable pendant 3 jours.\n\n"
        f"L'équipe EduStream"
    )
    html_text = (
        "<p>Bonjour <strong>%s</strong>,</p>"
        "<p>Merci de confirmer votre adresse email :</p>"
        '<p><a href="%s" style="background:#2563eb;color:#fff;padding:10px 18px;'
        'border-radius:8px;text-decoration:none;display:inline-block">'
        "Confirmer mon email</a></p>"
        "<p>Ce lien est valable pendant 3 jours.</p>"
        "<p>L'équipe EduStream</p>"
    ) % (user.full_name or user.email, verify_url)
    send_template_email(subject, user.email, plain_text, html_text)
    if settings.DEBUG:
        print(f"[EMAIL VERIFICATION] Link for {user.email}: {verify_url}")


def _send_welcome_email(user):
    subject = "Bienvenue sur EduStream"
    plain_text = (
        f"Bonjour {user.full_name or user.email},\n\n"
        f"Votre compte EduStream a été créé avec succès.\n"
        f"Connectez-vous dès maintenant pour commencer à apprendre :\n"
        f"{settings.FRONTEND_BASE_URL.rstrip('/')}/login\n\n"
        f"L'équipe EduStream"
    )
    html_text = (
        "<p>Bonjour <strong>%s</strong>,</p>"
        "<p>Votre compte EduStream a été créé avec succès.</p>"
        '<p><a href="%s/login" style="background:#2563eb;color:#fff;padding:10px 18px;'
        'border-radius:8px;text-decoration:none;display:inline-block">Se connecter</a></p>'
        "<p>L'équipe EduStream</p>"
    ) % (user.full_name or user.email, settings.FRONTEND_BASE_URL.rstrip("/"))
    send_template_email(subject, user.email, plain_text, html_text)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            logger.warning("login_failed email=%s", request.data.get("email", "?"))
            raise
        logger.info("login_success email=%s", request.data.get("email", "?"))
        return response


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def perform_create(self, serializer):
        user = serializer.save()
        _send_welcome_email(user)
        _send_verification_email(user)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verify"

    def post(self, request):
        user_id = request.data.get("user_id")
        token = request.data.get("token")
        if not user_id or not token:
            return Response(
                {"detail": "user_id and token are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(pk=user_id, is_active=True).first()
        if not user or not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired verification link."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.email_verified:
            return Response({"detail": "Email is already verified."})
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        logger.info("email_verified user=%s", user.email)
        return Response({"detail": "Email verified successfully."})


class ResendVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verify"

    def post(self, request):
        if request.user.email_verified:
            return Response({"detail": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)
        _send_verification_email(request.user)
        return Response({"detail": "Verification email sent."})


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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            code = PasswordResetCode.generate_code()
            expires_at = timezone.now() + timedelta(minutes=PasswordResetCode.CODE_VALIDITY_MINUTES)
            PasswordResetCode.objects.update_or_create(
                user=user,
                defaults={
                    "otp_hash": PasswordResetCode.hash_code(code),
                    "expires_at": expires_at,
                    "attempts": 0,
                    "used": False,
                },
            )
            subject = "Votre code de réinitialisation EduStream"
            plain_text = (
                f"Bonjour {user.full_name or user.email},\n\n"
                f"Vous avez demandé la réinitialisation de votre mot de passe.\n"
                f"Votre code de vérification est :\n\n"
                f"    {code}\n\n"
                f"Ce code expire dans {PasswordResetCode.CODE_VALIDITY_MINUTES} minutes. "
                f"Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.\n\n"
                f"L'équipe EduStream"
            )
            html_text = (
                "<p>Bonjour <strong>%s</strong>,</p>"
                "<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>"
                "<p>Votre code de vérification est :</p>"
                '<p style="font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;'
                'margin:16px 0;color:#2563eb">%s</p>'
                "<p>Ce code expire dans %d minutes. Si vous n'êtes pas à l'origine de cette demande, "
                "ignorez simplement cet email.</p>"
                "<p>L'équipe EduStream</p>"
            ) % (user.full_name or user.email, code, PasswordResetCode.CODE_VALIDITY_MINUTES)
            send_template_email(subject, user.email, plain_text, html_text)
            logger.info("password_reset_otp_sent email=%s", user.email)
            if settings.DEBUG:
                print(f"[FORGOT PASSWORD] OTP for {user.email}: {code}")
        return Response({"detail": "If that email exists, a reset code has been sent."})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        otp = request.data.get("otp", "").strip()
        new_password = request.data.get("new_password")
        if not email or not otp or not new_password:
            return Response(
                {"detail": "email, otp and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        code = getattr(user, "reset_code", None) if user else None
        if not code or not code.is_valid(otp):
            if code:
                code.attempts += 1
                code.save(update_fields=["attempts"])
            return Response(
                {"detail": "Invalid or expired reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code.used = True
        code.save(update_fields=["used"])
        user.set_password(new_password)
        user.save(update_fields=["password"])
        code.delete()
        logger.info("password_reset_completed email=%s", user.email)
        return Response({"detail": "Password reset successfully."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        if not current_password or not new_password:
            return Response({"detail": "Both current_password and new_password are required."}, status=400)
        if not request.user.check_password(current_password):
            logger.warning("change_password_wrong_current user=%s", request.user.email)
            return Response({"detail": "Current password is incorrect."}, status=400)
        try:
            validate_password(new_password, user=request.user)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        logger.info("password_changed user=%s", request.user.email)
        return Response({"detail": "Password updated successfully."})


class PublicStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from apps.courses.models import Course
        total_courses = Course.objects.filter(is_published=True).count()
        total_instructors = User.objects.filter(role="INSTRUCTOR", is_active=True).count()
        total_students = User.objects.filter(role="STUDENT", is_active=True).count()
        return Response({
            "total_courses": total_courses,
            "total_instructors": total_instructors,
            "total_students": total_students,
        })


class AdminWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == "ADMIN"

    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated and request.user.role == "ADMIN":
            return True
        if request.method in permissions.SAFE_METHODS:
            return obj.pk == request.user.pk
        return False


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AdminWritePermission]
    lookup_field = "pk"

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role == "ADMIN" or str(self.kwargs.get("pk")) == str(user.pk)):
            return UserSerializer
        return PublicUserSerializer


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
