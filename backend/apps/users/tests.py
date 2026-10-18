from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.courses.models import Course

from .models import Institution, PasswordResetCode

User = get_user_model()


@override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_CLASSES": []})
class AuthTests(APITestCase):
    def setUp(self):
        from apps.users import views

        views.ForgotPasswordView.throttle_classes = []
        views.ResetPasswordView.throttle_classes = []

        self.register_url = reverse("register")
        self.login_url = reverse("token_obtain_pair")
        self.me_url = reverse("me")
        self.users_list_url = reverse("users-list")
        self.forgot_password_url = reverse("forgot-password")
        self.public_stats_url = reverse("public-stats")

        # Create basic student and admin users
        self.student_data = {
            "email": "student@test.com",
            "full_name": "Test Student",
            "password": "securepassword123",
            "role": "STUDENT",
        }
        self.admin_data = {
            "email": "admin@test.com",
            "full_name": "Test Admin",
            "password": "adminsecurepassword123",
            "role": "ADMIN",
        }
        self.student_user = User.objects.create_user(**self.student_data)
        self.admin_user = User.objects.create_user(**self.admin_data)

    def test_register_user(self):
        data = {
            "email": "newuser@test.com",
            "full_name": "New User",
            "password": "newpassword123",
            "role": "STUDENT",
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(User.objects.filter(email="newuser@test.com").exists())

    def test_login_user(self):
        data = {
            "email": "student@test.com",
            "password": "securepassword123",
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_me_view_unauthenticated(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_view_authenticated(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.student_user.email)

        # Test partial update (PATCH)
        update_data = {"bio": "A passionate learning student", "location": "Burundi"}
        response = self.client.patch(self.me_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.bio, "A passionate learning student")
        self.assertEqual(self.student_user.location, "Burundi")

    def test_users_list_permissions(self):
        # Student user requesting users list - should only return themselves
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(self.users_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["email"], self.student_user.email)

        # Admin user requesting users list - should return both users
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.users_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)

    def test_forgot_password(self):
        response = self.client.post(self.forgot_password_url, {"email": "student@test.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(PasswordResetCode.objects.filter(user=self.student_user).exists())

    @patch("apps.users.views.PasswordResetCode.generate_code", return_value="123456")
    def test_forgot_and_reset_password_with_otp(self, _mock):
        self.client.post(self.forgot_password_url, {"email": "student@test.com"})
        code = PasswordResetCode.objects.get(user=self.student_user)
        self.assertTrue(code.is_valid("123456"))

        reset_url = reverse("reset-password")
        response = self.client.post(
            reset_url,
            {"email": "student@test.com", "otp": "999999", "new_password": "newpassword456"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        code.refresh_from_db()
        self.assertEqual(code.attempts, 1)

        response = self.client.post(
            reset_url,
            {"email": "student@test.com", "otp": "123456", "new_password": "newpassword456"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_user.refresh_from_db()
        self.assertTrue(self.student_user.check_password("newpassword456"))
        self.assertFalse(PasswordResetCode.objects.filter(user=self.student_user).exists())

    def test_reset_password_without_email(self):
        response = self.client.post(reverse("reset-password"), {"otp": "123456", "new_password": "newpassword456"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_stats(self):
        response = self.client.get(self.public_stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_courses", response.data)
        self.assertIn("total_instructors", response.data)
        self.assertIn("total_students", response.data)


@override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_CLASSES": []})
class InstitutionManagementTests(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="North Institute")
        self.other_institution = Institution.objects.create(name="South Institute")
        self.institution_admin = User.objects.create_user(
            email="institution-admin@test.com",
            full_name="Institution Admin",
            password="securepassword123",
            role="INSTITUTION_ADMIN",
            institution=self.institution,
        )
        self.instructor = User.objects.create_user(
            email="instructor@test.com",
            full_name="Instructor",
            password="securepassword123",
            role="INSTRUCTOR",
            institution=self.institution,
        )
        self.course = Course.objects.create(
            title="North Course",
            instructor=self.instructor,
            institution=self.institution,
        )

    def test_institution_admin_can_only_view_own_institution(self):
        self.client.force_authenticate(user=self.institution_admin)

        own_detail = self.client.get(reverse("institution-detail", args=[self.institution.pk]))
        foreign_detail = self.client.get(reverse("institution-detail", args=[self.other_institution.pk]))
        update = self.client.patch(
            reverse("institution-detail", args=[self.institution.pk]),
            {"name": "Renamed Institute"},
        )

        self.assertEqual(own_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(foreign_detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(update.status_code, status.HTTP_403_FORBIDDEN)

    def test_institution_admin_creates_member_only_in_own_institution(self):
        self.client.force_authenticate(user=self.institution_admin)

        response = self.client.post(
            reverse("institution-members", args=[self.institution.pk]),
            {
                "email": "new-instructor@test.com",
                "full_name": "New Instructor",
                "role": "INSTRUCTOR",
                "institution": str(self.other_institution.pk),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        created = User.objects.get(email="new-instructor@test.com")
        self.assertEqual(created.role, User.Role.INSTRUCTOR)
        self.assertEqual(created.institution_id, self.institution.pk)

    def test_instructor_cannot_grant_course_to_foreign_student(self):
        foreign_student = User.objects.create_user(
            email="foreign-student@test.com",
            full_name="Foreign Student",
            password="securepassword123",
            role="STUDENT",
            institution=self.other_institution,
        )
        self.client.force_authenticate(user=self.instructor)

        response = self.client.post(
            reverse("grant-course-access", args=[self.course.pk]),
            {"student_ids": [str(foreign_student.pk)]},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.users.views.send_template_email")
    def test_created_account_has_unique_temporary_password_and_must_change_it(self, send_email):
        self.client.force_authenticate(user=self.institution_admin)
        response = self.client.post(
            reverse("institution-members", args=[self.institution.pk]),
            {
                "email": "new-student@test.com",
                "full_name": "New Student",
                "role": "STUDENT",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(send_email.called)

        created = User.objects.get(email="new-student@test.com")
        temporary_password = send_email.call_args.args[2].splitlines()[3]
        self.assertTrue(created.check_password(temporary_password))
        self.assertNotEqual(temporary_password, "password123")
        self.assertTrue(created.must_change_password)

        token = str(RefreshToken.for_user(created).access_token)
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        blocked = self.client.get(reverse("users-list"))
        allowed = self.client.get(reverse("me"))
        self.assertEqual(blocked.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)

        changed = self.client.post(
            reverse("change-password"),
            {
                "current_password": temporary_password,
                "new_password": "A brand-new secure pass 829!",
            },
        )
        self.assertEqual(changed.status_code, status.HTTP_200_OK)
        created.refresh_from_db()
        self.assertFalse(created.must_change_password)
        self.assertEqual(self.client.get(reverse("users-list")).status_code, status.HTTP_200_OK)
