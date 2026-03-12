from rest_framework import serializers

from .models import AITutorMessage


class AITutorMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITutorMessage
        fields = "__all__"
        read_only_fields = ["user", "response"]
