from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
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
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        scope["user"] = AnonymousUser()
        if token:
            try:
                scope["user"] = await get_user_for_token(token)
            except InvalidToken:
                scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)


def QueryStringJWTAuthMiddlewareStack(inner):
    return QueryStringJWTAuthMiddleware(inner)
