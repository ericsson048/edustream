from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import ForgotPasswordView, MeView, PublicStatsView, RegisterView, UserDetailView, UserListView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("users/", UserListView.as_view(), name="users-list"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("public/stats/", PublicStatsView.as_view(), name="public-stats"),
]
