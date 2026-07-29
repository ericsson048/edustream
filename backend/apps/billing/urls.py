from django.urls import path

from .views import (
    CourseCheckoutStatusView,
    CourseCheckoutView,
    InstructorEarningsView,
    MySubscriptionView,
    PlanListView,
    StripeWebhookView,
    SubscribeView,
    TransactionListView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing-plans"),
    path("subscribe/", SubscribeView.as_view(), name="billing-subscribe"),
    path("subscription/", MySubscriptionView.as_view(), name="billing-my-subscription"),
    path("checkout/<uuid:course_id>/", CourseCheckoutView.as_view(), name="billing-checkout-course"),
    path("checkout/session/", CourseCheckoutStatusView.as_view(), name="billing-checkout-session"),
    path("webhook/", StripeWebhookView.as_view(), name="billing-webhook"),
    path("instructor/earnings/", InstructorEarningsView.as_view(), name="instructor-earnings"),
    path("transactions/", TransactionListView.as_view(), name="transactions-list"),
]
