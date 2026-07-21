from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
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
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
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

    def test_public_stats(self):
        response = self.client.get(self.public_stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_courses", response.data)
        self.assertIn("total_instructors", response.data)
        self.assertIn("total_students", response.data)
