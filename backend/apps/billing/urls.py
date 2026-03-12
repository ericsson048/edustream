from django.urls import path

from .views import (
    CourseCheckoutView,
    InstructorEarningsView,
    PlanListView,
    StripeWebhookView,
    SubscribeView,
    TransactionListView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing-plans"),
    path("subscribe/", SubscribeView.as_view(), name="billing-subscribe"),
    path("checkout/<uuid:course_id>/", CourseCheckoutView.as_view(), name="billing-checkout-course"),
    path("webhook/", StripeWebhookView.as_view(), name="billing-webhook"),
    path("instructor/earnings/", InstructorEarningsView.as_view(), name="instructor-earnings"),
    path("transactions/", TransactionListView.as_view(), name="transactions-list"),
]
