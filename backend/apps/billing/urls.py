from django.urls import path

from .views import (
    AdminPlanDetailView,
    AdminPlanListCreateView,
    CourseCheckoutStatusView,
    CourseCheckoutView,
    InstructorEarningsView,
    MySubscriptionView,
    PlanListView,
    StripeWebhookView,
    SubscribeView,
    TransactionListView,
    TransactionRefundView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing-plans"),
    path("admin/plans/", AdminPlanListCreateView.as_view(), name="admin-billing-plans"),
    path("admin/plans/<uuid:pk>/", AdminPlanDetailView.as_view(), name="admin-billing-plan-detail"),
    path("subscribe/", SubscribeView.as_view(), name="billing-subscribe"),
    path("subscription/", MySubscriptionView.as_view(), name="billing-my-subscription"),
    path("checkout/<uuid:course_id>/", CourseCheckoutView.as_view(), name="billing-checkout-course"),
    path("checkout/session/", CourseCheckoutStatusView.as_view(), name="billing-checkout-session"),
    path("webhook/", StripeWebhookView.as_view(), name="billing-webhook"),
    path("instructor/earnings/", InstructorEarningsView.as_view(), name="instructor-earnings"),
    path("transactions/", TransactionListView.as_view(), name="transactions-list"),
    path("transactions/<uuid:pk>/refund/", TransactionRefundView.as_view(), name="transactions-refund"),
]
