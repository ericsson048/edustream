from rest_framework import serializers

from .models import PlatformSetting, SupportTicket


class SupportTicketSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_avatar = serializers.CharField(source="user.avatar_url", read_only=True)
    replied_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            "id", "user", "user_full_name", "user_email", "user_avatar",
            "subject", "message",
            "status", "priority",
            "admin_reply", "replied_by", "replied_by_name", "replied_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "replied_by", "replied_at"]

    def get_replied_by_name(self, obj):
        return obj.replied_by.full_name if obj.replied_by else None


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = ["key", "value"]
