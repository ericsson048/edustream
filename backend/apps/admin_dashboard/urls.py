from django.urls import path

from .views import (
    DashboardStatsView,
    PlatformSettingDetailView,
    PlatformSettingListView,
    RevenueReportView,
    SupportTicketDetailView,
    SupportTicketListCreateView,
)

urlpatterns = [
    path("admin/dashboard/stats/", DashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("admin/reports/revenue/", RevenueReportView.as_view(), name="admin-reports-revenue"),
    path("admin/support/tickets/", SupportTicketListCreateView.as_view(), name="admin-support-tickets"),
    path("admin/support/tickets/<uuid:pk>/", SupportTicketDetailView.as_view(), name="admin-support-ticket-detail"),
    path("admin/settings/", PlatformSettingListView.as_view(), name="admin-settings"),
    path("admin/settings/<str:key>/", PlatformSettingDetailView.as_view(), name="admin-setting-detail"),
]
