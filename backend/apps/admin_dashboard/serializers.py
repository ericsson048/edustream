from rest_framework import serializers

from .models import PlatformSetting, SupportTicket


class SupportTicketSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "user",
            "user_full_name",
            "user_email",
            "subject",
            "message",
            "status",
            "priority",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = ["key", "value"]
