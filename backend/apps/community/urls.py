from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DiscussionCommentViewSet, DiscussionViewSet, StudyGroupMessageViewSet, StudyGroupViewSet

router = DefaultRouter()
router.register(r"discussions", DiscussionViewSet, basename="discussion")
router.register(r"discussion-comments", DiscussionCommentViewSet, basename="discussion-comment")
router.register(r"study-groups", StudyGroupViewSet, basename="study-group")
router.register(r"study-group-messages", StudyGroupMessageViewSet, basename="study-group-message")

urlpatterns = [
    path("", include(router.urls)),
]
