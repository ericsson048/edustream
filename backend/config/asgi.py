import os
from importlib.util import find_spec

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

if find_spec("channels"):
    from channels.routing import ProtocolTypeRouter, URLRouter

    from apps.ai_tutor.routing import websocket_urlpatterns as ai_tutor_websocket_urlpatterns
    from apps.community.routing import websocket_urlpatterns as community_websocket_urlpatterns
    from apps.live.routing import websocket_urlpatterns as live_websocket_urlpatterns
    from apps.messaging.routing import websocket_urlpatterns as messaging_websocket_urlpatterns
    from config.jwt_auth import QueryStringJWTAuthMiddlewareStack

    websocket_urlpatterns = [
        *live_websocket_urlpatterns,
        *community_websocket_urlpatterns,
        *messaging_websocket_urlpatterns,
        *ai_tutor_websocket_urlpatterns,
    ]

    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": QueryStringJWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
        }
    )
else:
    application = django_asgi_app
