from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LiveParticipantViewSet, LiveSessionViewSet

router = DefaultRouter()
router.register(r"live-sessions", LiveSessionViewSet, basename="live-session")
router.register(r"live-participants", LiveParticipantViewSet, basename="live-participant")

urlpatterns = [
    path("", include(router.urls)),
]
