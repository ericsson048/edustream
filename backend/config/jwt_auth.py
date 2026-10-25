from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


@database_sync_to_async
def get_user_for_token(token):
    authenticator = JWTAuthentication()
    validated_token = authenticator.get_validated_token(token)
    return authenticator.get_user(validated_token)


class QueryStringJWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        auth_protocol = next(
            (protocol for protocol in scope.get("subprotocols", []) if protocol.startswith("edustream.jwt.")),
            None,
        )
        token = auth_protocol.removeprefix("edustream.jwt.") if auth_protocol else None
        scope["user"] = AnonymousUser()
        scope["edustream_auth_protocol"] = auth_protocol
        if token:
            try:
                scope["user"] = await get_user_for_token(token)
            except InvalidToken:
                scope["user"] = AnonymousUser()

        async def send_with_auth_protocol(message):
            if message["type"] == "websocket.accept" and auth_protocol:
                message = {**message, "subprotocol": auth_protocol}
            await send(message)

        return await self.inner(scope, receive, send_with_auth_protocol)


def QueryStringJWTAuthMiddlewareStack(inner):
    return QueryStringJWTAuthMiddleware(inner)
