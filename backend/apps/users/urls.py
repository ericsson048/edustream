from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from .views import (
    ChangePasswordView,
    CourseAccessStudentsView,
    ForgotPasswordView,
    GrantCourseAccessView,
    InstitutionDetailView,
    InstitutionListCreateView,
    InstitutionMembersView,
    InstructorStudentCreateView,
    InstructorStudentListView,
    LoginView,
    MeView,
    MyPreferencesView,
    MyStatsView,
    PublicStatsView,
    RegisterView,
    ResendVerificationView,
    ResetPasswordView,
    RevokeCourseAccessView,
    UserDetailView,
    UserListView,
    VerifyEmailView,
)

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="token_blacklist"),

    # Me
    path("me/", MeView.as_view(), name="me"),
    path("me/stats/", MyStatsView.as_view(), name="me-stats"),
    path("me/preferences/", MyPreferencesView.as_view(), name="me-preferences"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # Users (admin)
    path("users/", UserListView.as_view(), name="users-list"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="user-detail"),

    # Password reset
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),

    # Email verification
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),

    # Stats
    path("public/stats/", PublicStatsView.as_view(), name="public-stats"),

    # Institutions (admin manages institutions)
    path("institutions/", InstitutionListCreateView.as_view(), name="institution-list"),
    path("institutions/<uuid:pk>/", InstitutionDetailView.as_view(), name="institution-detail"),
    path("institutions/<uuid:pk>/members/", InstitutionMembersView.as_view(), name="institution-members"),

    # Instructor student management
    path("instructor/students/", InstructorStudentListView.as_view(), name="instructor-students-list"),
    path("instructor/students/create/", InstructorStudentCreateView.as_view(), name="instructor-students-create"),

    # Course access (grant/revoke/list)
    path("courses/<uuid:course_id>/access/", CourseAccessStudentsView.as_view(), name="course-access-students"),
    path("courses/<uuid:course_id>/grant-access/", GrantCourseAccessView.as_view(), name="grant-course-access"),
    path("courses/<uuid:course_id>/revoke-access/", RevokeCourseAccessView.as_view(), name="revoke-course-access"),
]
