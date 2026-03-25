from django.urls import re_path

from .consumers import TutorChatConsumer

websocket_urlpatterns = [
    re_path(r"^ws/ai/tutor/$", TutorChatConsumer.as_asgi()),
]
