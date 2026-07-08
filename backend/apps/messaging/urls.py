from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConversationViewSet, MessageViewSet, list_contacts

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("", include(router.urls)),
    path("contacts/", list_contacts, name="list-contacts"),
]
