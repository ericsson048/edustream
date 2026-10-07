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
from .models import Institution, PasswordResetCode
from .serializers import (
    CreateManagedUserSerializer,
    InstitutionSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    UserSerializer,
)

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


class MyStatsView(APIView):
    """Personal stats for the authenticated user (profile dashboard)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        stats = {
            "courses_enrolled": 0,
            "courses_completed": 0,
            "certificates_count": 0,
            "assignments_submitted": 0,
            "quiz_attempts": 0,
            "total_focus_minutes": 0,
            "streak_days": 0,
        }
        try:
            from apps.learning.models import Enrollment, Assignment, Submission, QuizAttempt
            enrollments = Enrollment.objects.filter(student=user, is_active=True)
            stats["courses_enrolled"] = enrollments.count()

            # completed = progression 100%
            completed = 0
            for enroll in enrollments:
                lessons = enroll.course.modules.prefetch_related('lessons').all()
                total = sum(m.lessons.filter(status='PUBLISHED').count() for m in lessons)
                if total > 0:
                    from apps.learning.models import Progress
                    done = Progress.objects.filter(enrollment=enroll, is_completed=True).count()
                    if done >= total:
                        completed += 1
            stats["courses_completed"] = completed
        except Exception:
            pass

        try:
            from apps.learning.models import Submission
            stats["assignments_submitted"] = Submission.objects.filter(student=user).count()
        except Exception:
            pass

        try:
            from apps.learning.models import QuizAttempt
            stats["quiz_attempts"] = QuizAttempt.objects.filter(student=user).count()
        except Exception:
            pass

        try:
            from apps.learning.models import Certificate
            stats["certificates_count"] = Certificate.objects.filter(user=user).count()
        except Exception:
            pass

        try:
            from apps.learning.models import FocusSession
            from django.db.models import Sum
            total = FocusSession.objects.filter(user=user).aggregate(total=Sum('duration_minutes'))['total']
            stats["total_focus_minutes"] = total or 0
        except Exception:
            pass

        try:
            from apps.learning.models import UserActivity
            from django.utils import timezone
            import datetime
            today = timezone.now().date()
            streak = 0
            for i in range(365):
                day = today - datetime.timedelta(days=i)
                if UserActivity.objects.filter(user=user, created_at__date=day).exists():
                    streak += 1
                else:
                    break
            stats["streak_days"] = streak
        except Exception:
            pass

        return Response(stats)


class MyPreferencesView(APIView):
    """Get and update notification preferences stored in user.preferences."""
    permission_classes = [permissions.IsAuthenticated]

    _defaults = {
        "notif_email": True,
        "notif_push": True,
        "notif_new_course": True,
        "notif_assignments": True,
        "notif_grades": True,
        "notif_messages": True,
        "notif_live": True,
    }

    def get(self, request):
        prefs = {**self._defaults, **request.user.preferences.get("notifications", {})}
        return Response(prefs)

    def patch(self, request):
        allowed_keys = set(self._defaults.keys())
        incoming = {k: bool(v) for k, v in request.data.items() if k in allowed_keys}
        user = request.user
        notifs = {**user.preferences.get("notifications", {}), **incoming}
        user.preferences = {**user.preferences, "notifications": notifs}
        user.save(update_fields=["preferences"])
        return Response({**self._defaults, **notifs})


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


# ─── Institution views ───────────────────────────────────────────────────────

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsInstitutionAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("ADMIN", "INSTITUTION_ADMIN")


class IsInstructorOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("ADMIN", "INSTITUTION_ADMIN", "INSTRUCTOR")


class InstitutionListCreateView(generics.ListCreateAPIView):
    """ADMIN: list and create institutions."""
    serializer_class = InstitutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return Institution.objects.all()
        if user.role == "INSTITUTION_ADMIN" and user.institution:
            return Institution.objects.filter(pk=user.institution.pk)
        return Institution.objects.none()

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InstitutionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """ADMIN: retrieve, update, delete an institution."""
    serializer_class = InstitutionSerializer
    permission_classes = [IsAdmin]
    queryset = Institution.objects.all()
    lookup_field = "pk"


class InstitutionMembersView(APIView):
    """List members of an institution (ADMIN or INSTITUTION_ADMIN of that institution)."""
    permission_classes = [IsInstitutionAdmin]

    def _get_institution(self, pk):
        try:
            return Institution.objects.get(pk=pk)
        except Institution.DoesNotExist:
            return None

    def get(self, request, pk):
        institution = self._get_institution(pk)
        if not institution:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        # INSTITUTION_ADMIN can only see their own institution
        if request.user.role == "INSTITUTION_ADMIN" and request.user.institution_id != institution.pk:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        role_filter = request.query_params.get("role")
        qs = institution.members.filter(is_active=True)
        if role_filter:
            qs = qs.filter(role=role_filter)
        return Response(UserSerializer(qs, many=True).data)

    def post(self, request, pk):
        """Create a new member (INSTRUCTOR or STUDENT) in the institution."""
        institution = self._get_institution(pk)
        if not institution:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "INSTITUTION_ADMIN" and request.user.institution_id != institution.pk:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CreateManagedUserSerializer(
            data={**request.data, "institution": str(institution.pk)},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info("institution_member_created institution=%s new_user=%s by=%s", institution.name, user.email, request.user.email)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class InstructorStudentCreateView(APIView):
    """INSTRUCTOR: create a student account linked to them."""
    permission_classes = [IsInstructorOrAbove]

    def post(self, request):
        data = {**request.data, "role": "STUDENT"}
        serializer = CreateManagedUserSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info("instructor_created_student instructor=%s student=%s", request.user.email, user.email)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class InstructorStudentListView(generics.ListAPIView):
    """INSTRUCTOR: list students they created."""
    serializer_class = UserSerializer
    permission_classes = [IsInstructorOrAbove]

    def get_queryset(self):
        return User.objects.filter(
            created_by=self.request.user,
            role="STUDENT",
            is_active=True,
        ).order_by("-date_joined")


class GrantCourseAccessView(APIView):
    """INSTRUCTOR: grant access to one of their courses to specific students."""
    permission_classes = [IsInstructorOrAbove]

    def post(self, request, course_id):
        from apps.courses.models import Course, CourseStudentAccess, Enrollment

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        # Only the instructor who owns the course (or admin) can grant access
        if request.user.role not in ("ADMIN",) and course.instructor_id != request.user.pk:
            return Response({"detail": "You don't own this course."}, status=status.HTTP_403_FORBIDDEN)

        student_ids = request.data.get("student_ids", [])
        if not student_ids:
            return Response({"detail": "student_ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        granted = []
        already_exists = []
        for sid in student_ids:
            try:
                student = User.objects.get(pk=sid, role="STUDENT", is_active=True)
            except (User.DoesNotExist, Exception):
                continue

            access, created = CourseStudentAccess.objects.get_or_create(
                course=course, student=student,
                defaults={"granted_by": request.user},
            )
            if created:
                # Auto-enroll the student
                Enrollment.objects.get_or_create(student=student, course=course)
                granted.append(str(student.pk))
                logger.info("course_access_granted course=%s student=%s by=%s", course.title, student.email, request.user.email)
            else:
                already_exists.append(str(student.pk))

        return Response({
            "granted": granted,
            "already_had_access": already_exists,
        }, status=status.HTTP_200_OK)


class RevokeCourseAccessView(APIView):
    """INSTRUCTOR: revoke course access from a student."""
    permission_classes = [IsInstructorOrAbove]

    def post(self, request, course_id):
        from apps.courses.models import Course, CourseStudentAccess, Enrollment

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in ("ADMIN",) and course.instructor_id != request.user.pk:
            return Response({"detail": "You don't own this course."}, status=status.HTTP_403_FORBIDDEN)

        student_id = request.data.get("student_id")
        if not student_id:
            return Response({"detail": "student_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        CourseStudentAccess.objects.filter(course=course, student_id=student_id).delete()
        Enrollment.objects.filter(course=course, student_id=student_id).update(is_active=False)
        return Response({"detail": "Access revoked."})


class CourseAccessStudentsView(APIView):
    """INSTRUCTOR: list students who have been granted access to a course."""
    permission_classes = [IsInstructorOrAbove]

    def get(self, request, course_id):
        from apps.courses.models import Course, CourseStudentAccess

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in ("ADMIN",) and course.instructor_id != request.user.pk:
            return Response({"detail": "You don't own this course."}, status=status.HTTP_403_FORBIDDEN)

        accesses = CourseStudentAccess.objects.filter(course=course).select_related("student")
        data = [
            {
                "access_id": str(a.pk),
                "student_id": str(a.student.pk),
                "student_name": a.student.full_name,
                "student_email": a.student.email,
                "avatar_url": a.student.avatar_url,
                "granted_at": a.created_at.isoformat(),
            }
            for a in accesses
        ]
        return Response(data)
