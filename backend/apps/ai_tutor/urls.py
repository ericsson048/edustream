from django.urls import path

from .views import TutorChatView

urlpatterns = [
    path("tutor/chat/", TutorChatView.as_view(), name="ai-tutor-chat"),
]
