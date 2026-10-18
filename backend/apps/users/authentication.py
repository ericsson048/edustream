from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class PasswordChangeRequiredJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if not result:
            return None

        user, token = result
        if user.must_change_password:
            allowed_requests = {
                ("GET", "/api/v1/auth/me/"),
                ("POST", "/api/v1/auth/change-password/"),
            }
            if (request.method, request.path_info) not in allowed_requests:
                raise AuthenticationFailed("Change your temporary password before continuing.")

        return user, token