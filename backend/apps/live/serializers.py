import uuid

from rest_framework import serializers

from .models import LiveParticipant, LiveSession


class LiveParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = LiveParticipant
        fields = "__all__"


class LiveSessionSerializer(serializers.ModelSerializer):
    participants = LiveParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = LiveSession
        fields = "__all__"
        read_only_fields = ["instructor", "room_name"]

    def create(self, validated_data):
        validated_data["room_name"] = f"live-{uuid.uuid4().hex[:10]}"
        return super().create(validated_data)
