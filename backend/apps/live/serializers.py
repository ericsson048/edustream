import uuid

from rest_framework import serializers

from .models import LiveParticipant, LiveSession


class LiveParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = LiveParticipant
        fields = [
            "id",
            "session",
            "user",
            "user_name",
            "role",
            "is_mic_on",
            "is_camera_on",
            "is_screen_sharing",
            "hand_raised",
            "is_recording",
            "last_reaction",
            "joined_at",
            "left_at",
        ]


class LiveSessionSerializer(serializers.ModelSerializer):
    participants = LiveParticipantSerializer(many=True, read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    enrolled_students = serializers.IntegerField(source="course.enrollments.count", read_only=True)
    instructor_name = serializers.CharField(source="instructor.full_name", read_only=True)
    instructor_id = serializers.UUIDField(source="instructor.id", read_only=True)

    class Meta:
        model = LiveSession
        fields = "__all__"
        read_only_fields = ["instructor", "room_name"]

    def create(self, validated_data):
        validated_data["room_name"] = f"live-{uuid.uuid4().hex[:10]}"
        return super().create(validated_data)
