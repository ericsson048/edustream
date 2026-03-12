from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DiscussionCommentViewSet, DiscussionViewSet, StudyGroupViewSet

router = DefaultRouter()
router.register(r"discussions", DiscussionViewSet, basename="discussion")
router.register(r"discussion-comments", DiscussionCommentViewSet, basename="discussion-comment")
router.register(r"study-groups", StudyGroupViewSet, basename="study-group")

urlpatterns = [
    path("", include(router.urls)),
]
