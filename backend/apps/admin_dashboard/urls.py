from django.urls import path

from .views import (
    BroadcastNotificationView,
    DashboardStatsView,
    PlatformSettingDetailView,
    PlatformSettingListView,
    RevenueReportView,
    SupportTicketDetailView,
    SupportTicketListCreateView,
    SupportTicketReplyView,
    UserSupportTicketView,
)

urlpatterns = [
    path("admin/dashboard/stats/", DashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("admin/reports/revenue/", RevenueReportView.as_view(), name="admin-reports-revenue"),

    # Admin ticket management
    path("admin/support/tickets/", SupportTicketListCreateView.as_view(), name="admin-support-tickets"),
    path("admin/support/tickets/<uuid:pk>/", SupportTicketDetailView.as_view(), name="admin-support-ticket-detail"),
    path("admin/support/tickets/<uuid:pk>/reply/", SupportTicketReplyView.as_view(), name="admin-support-ticket-reply"),

    # User ticket (any authenticated user)
    path("support/tickets/", UserSupportTicketView.as_view(), name="user-support-tickets"),

    path("admin/settings/", PlatformSettingListView.as_view(), name="admin-settings"),
    path("admin/settings/<str:key>/", PlatformSettingDetailView.as_view(), name="admin-setting-detail"),
    path("admin/notifications/broadcast/", BroadcastNotificationView.as_view(), name="admin-notifications-broadcast"),
]
