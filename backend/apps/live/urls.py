from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LiveChatMessageViewSet, LiveParticipantViewSet, LiveSessionViewSet

router = DefaultRouter()
router.register(r"live-sessions", LiveSessionViewSet, basename="live-session")
router.register(r"live-participants", LiveParticipantViewSet, basename="live-participant")
router.register(r"live-chat-messages", LiveChatMessageViewSet, basename="live-chat-message")

urlpatterns = [
    path("", include(router.urls)),
]
