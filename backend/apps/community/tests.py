from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.courses.models import Course
from .models import Discussion, DiscussionComment, StudyGroup

User = get_user_model()


class CommunitySecurityTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email="student@test.com", full_name="Student", password="password123", role="STUDENT"
        )
        self.other = User.objects.create_user(
            email="other@test.com", full_name="Other", password="password123", role="STUDENT"
        )
        self.course = Course.objects.create(
            title="C", description="D", level="BEGINNER", price=0, is_published=True, instructor=self.student
        )
        self.discussion = Discussion.objects.create(course=self.course, author=self.student, title="T", content="Body")
        self.comment = DiscussionComment.objects.create(discussion=self.discussion, author=self.student, content="Reply")
        self.group = StudyGroup.objects.create(name="G", description="", created_by=self.student)

    def test_discussion_cannot_be_edited_by_other_user(self):
        self.client.force_authenticate(user=self.other)
        url = reverse("discussion-detail", args=[self.discussion.id])
        response = self.client.patch(url, {"title": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_comment_cannot_be_deleted_by_other_user(self):
        self.client.force_authenticate(user=self.other)
        url = reverse("discussion-comment-detail", args=[self.comment.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_study_group_cannot_be_deleted_by_non_creator(self):
        self.client.force_authenticate(user=self.other)
        url = reverse("study-group-detail", args=[self.group.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_own_discussion(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("discussion-detail", args=[self.discussion.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
