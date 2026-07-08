from rest_framework import serializers

from .models import AITutorConversation, AITutorMessage


class AITutorMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITutorMessage
        fields = ["id", "prompt", "response", "created_at", "conversation"]
        read_only_fields = ["id", "response", "created_at"]


class AITutorConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = AITutorConversation
        fields = "__all__"
        read_only_fields = ["user"]

    def get_message_count(self, obj):
        return obj.messages.count()
