from rest_framework import serializers

from .models import SubscriptionPlan, Transaction, UserSubscription
from .services import get_streaming_remaining


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    stream_minutes_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = "__all__"

    def get_stream_minutes_remaining(self, obj):
        return get_streaming_remaining(obj.user)


class TransactionSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Transaction
        fields = "__all__"
