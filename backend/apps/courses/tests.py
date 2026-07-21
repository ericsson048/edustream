from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Course, Enrollment, Lesson, Module, Progress

User = get_user_model()


class CourseTests(APITestCase):
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

        # Create category
        self.category = Category.objects.create(name="Web Development", slug="web-dev")

        # Create published course
        self.course_published = Course.objects.create(
            title="Introduction to React",
            subtitle="Learn React from scratch",
            description="Detailed course",
            category=self.category,
            level="BEGINNER",
            price=29.99,
            is_published=True,
            instructor=self.instructor,
        )

        # Create draft course
        self.course_draft = Course.objects.create(
            title="Advanced React",
            subtitle="Deep dive react",
            description="Draft content",
            category=self.category,
            level="ADVANCED",
            price=49.99,
            is_published=False,
            instructor=self.instructor,
        )

        # Create module & lesson for progression testing
        self.module = Module.objects.create(
            course=self.course_published,
            title="React Basics",
            order=1,
        )
        self.lesson = Lesson.objects.create(
            module=self.module,
            title="Getting Started",
            lesson_type="VIDEO",
            status="PUBLISHED",
            order=1,
        )

    def test_list_categories(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("category-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Category view is paginated
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Web Development")

    def test_list_courses_student_sees_published_only(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("course-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Introduction to React")

    def test_list_courses_instructor_sees_own_drafts(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        # Should see both published React (since it's a course) and draft course they created
        self.assertEqual(len(results), 2)

    def test_create_course_instructor(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-list")
        data = {
            "title": "Django for Beginners",
            "price": "19.99",
            "level": "BEGINNER",
            "category": str(self.category.id),
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Course.objects.filter(title="Django for Beginners").exists())

    def test_create_course_student_forbidden(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("course-list")
        data = {
            "title": "Django for Students",
            "price": "19.99",
            "level": "BEGINNER",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_progress_tracking(self):
        # Enroll student in published course
        enrollment = Enrollment.objects.create(student=self.student, course=self.course_published)

        # Force authentication and call progression update API or verify model creation
        self.client.force_authenticate(user=self.student)
        
        # Check that we can record progress
        progress = Progress.objects.create(
            enrollment=enrollment,
            lesson=self.lesson,
            completion=100.00,
            is_completed=True,
        )
        
        self.assertEqual(Progress.objects.filter(enrollment=enrollment, lesson=self.lesson, is_completed=True).count(), 1)
