from django.urls import re_path

from .consumers import LiveSessionConsumer

websocket_urlpatterns = [
    re_path(r"^ws/live/(?P<session_id>[0-9a-f-]+)/$", LiveSessionConsumer.as_asgi()),
]
