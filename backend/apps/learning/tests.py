import io
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.courses.models import Category, Course, Enrollment, Module

from .models import Assignment, Extension, Notification, Submission

User = get_user_model()


class AssignmentFlowTests(APITestCase):
    def setUp(self):
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
        self.category = Category.objects.create(name="Web Dev", slug="web-dev")
        self.course = Course.objects.create(
            title="React",
            category=self.category,
            level="BEGINNER",
            price=29.99,
            is_published=True,
            instructor=self.instructor,
        )
        Enrollment.objects.create(course=self.course, student=self.student, is_active=True)
        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Project 1",
            due_date=timezone.now() + timedelta(days=3),
            points=100,
            type="PROJECT",
            created_by=self.instructor,
        )

    def test_student_cannot_create_assignment(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("assignment-list")
        response = self.client.post(url, {"course": self.course.id, "title": "X", "due_date": timezone.now()})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assignment_creation_notifies_enrolled_students(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("assignment-list")
        response = self.client.post(
            url,
            {"course": self.course.id, "title": "Project 2", "due_date": timezone.now().isoformat(), "points": 100, "type": "PROJECT"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        notifications = Notification.objects.filter(user=self.student, notification_type="ASSIGNMENT")
        self.assertEqual(notifications.count(), 1)

    def test_grade_validation_bounds(self):
        self.client.force_authenticate(user=self.instructor)
        submission = Submission.objects.create(assignment=self.assignment, student=self.student)
        url = reverse("submission-grade", args=[submission.id])
        response = self.client.post(url, {"grade": "150"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(url, {"grade": "-5"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(url, {"grade": "abc"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(url, {"grade": "75", "feedback": "Good"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        submission.refresh_from_db()
        self.assertEqual(str(submission.grade), "75.00")
        self.assertEqual(submission.status, "GRADED")
        notification = Notification.objects.filter(user=self.student, notification_type="GRADE").first()
        self.assertIsNotNone(notification)
        self.assertIn("75", notification.body)

    def test_grades_not_visible_until_published(self):
        submission = Submission.objects.create(
            assignment=self.assignment,
            student=self.student,
            grade=50,
            status="GRADED",
            is_published=False,
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("submission-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertFalse(results[0]["is_published"])

    def test_instructor_publishes_single_submission(self):
        submission = Submission.objects.create(
            assignment=self.assignment,
            student=self.student,
            grade=50,
            status="GRADED",
        )
        self.client.force_authenticate(user=self.instructor)
        url = reverse("submission-publish", args=[submission.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        submission.refresh_from_db()
        self.assertTrue(submission.is_published)

    def test_publish_all_grades(self):
        Submission.objects.create(
            assignment=self.assignment,
            student=self.student,
            grade=50,
            status="GRADED",
            is_published=False,
        )
        self.client.force_authenticate(user=self.instructor)
        url = reverse("assignment-publish-grades", args=[self.assignment.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["published"], 1)

    def test_stats_reports_missing_students(self):
        Submission.objects.create(
            assignment=self.assignment,
            student=self.student,
            grade=80,
            status="GRADED",
        )
        other = User.objects.create_user(
            email="other@test.com",
            full_name="Other Student",
            password="password123",
            role="STUDENT",
        )
        Enrollment.objects.create(course=self.course, student=other, is_active=True)
        self.client.force_authenticate(user=self.instructor)
        url = reverse("assignment-stats", args=[self.assignment.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["submitted_count"], 1)
        self.assertEqual(response.data["missing_count"], 1)
        self.assertEqual(response.data["missing_students"][0]["id"], other.id)
        self.assertEqual(response.data["average_grade"], 80.0)

    def test_extend_deadline(self):
        new_deadline = timezone.now() + timedelta(days=10)
        self.client.force_authenticate(user=self.instructor)
        url = reverse("assignment-extend", args=[self.assignment.id])
        response = self.client.post(url, {"student_id": self.student.id, "new_deadline": new_deadline.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        extension = Extension.objects.get(assignment=self.assignment, student=self.student)
        self.assertEqual(extension.granted_by, self.instructor)
        submission = Submission.objects.create(assignment=self.assignment, student=self.student)
        self.assertFalse(submission.is_late)

    def test_submission_uploads_file_and_validates_extension(self):
        self.assignment.allowed_extensions = [".pdf", ".zip"]
        self.assignment.save()
        self.client.force_authenticate(user=self.student)
        url = reverse("submission-list")
        content = b"%PDF-1.4 fake pdf"
        pdf = io.BytesIO(content)
        pdf.name = "upload.pdf"
        response = self.client.post(
            url,
            {"assignment": self.assignment.id, "file": pdf},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        submission = Submission.objects.get(assignment=self.assignment, student=self.student)
        self.assertEqual(submission.file_name, "upload.pdf")
        self.assertTrue(submission.file_url.startswith("http"))

        # Rejected extension
        exe = io.BytesIO(b"data")
        exe.name = "virus.exe"
        response = self.client.post(
            url,
            {"assignment": self.assignment.id, "file": exe},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_late_flag_when_after_deadline(self):
        self.assignment.due_date = timezone.now() - timedelta(days=1)
        self.assignment.save()
        submission = Submission.objects.create(assignment=self.assignment, student=self.student)
        self.assertTrue(submission.is_late)

    def test_student_resubmits_uploaded_file(self):
        self.assignment.allowed_extensions = [".pdf", ".zip"]
        self.assignment.save()
        self.client.force_authenticate(user=self.student)
        url = reverse("submission-list")
        first = io.BytesIO(b"%PDF-1.4 first")
        first.name = "v1.pdf"
        response = self.client.post(
            url,
            {"assignment": self.assignment.id, "file": first},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        submission = Submission.objects.get(assignment=self.assignment, student=self.student)
        old_url = submission.file_url

        second = io.BytesIO(b"%PDF-1.4 second")
        second.name = "v2.pdf"
        response = self.client.patch(
            reverse("submission-detail", args=[submission.id]),
            {"file": second},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        submission.refresh_from_db()
        self.assertEqual(submission.file_name, "v2.pdf")
        self.assertNotEqual(submission.file_url, old_url)

    def test_resubmission_clears_grade_until_regraded(self):
        self.client.force_authenticate(user=self.instructor)
        submission = Submission.objects.create(
            assignment=self.assignment, student=self.student, grade=80, feedback="Bien",
            status=Submission.Status.GRADED,
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            reverse("submission-detail", args=[submission.id]),
            {"content_text": "Version corrigée"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        submission.refresh_from_db()
        self.assertEqual(submission.status, Submission.Status.SUBMITTED)
        self.assertIsNone(submission.grade)
        self.assertEqual(submission.feedback, "")
        self.assertFalse(submission.is_published)

    def test_cannot_resubmit_after_publication(self):
        self.client.force_authenticate(user=self.instructor)
        submission = Submission.objects.create(
            assignment=self.assignment, student=self.student, grade=90,
            status=Submission.Status.GRADED, is_published=True,
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            reverse("submission-detail", args=[submission.id]),
            {"content_text": "Tentative"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
