import uuid

from rest_framework import serializers

from apps.billing.services import get_streaming_remaining

from .models import LiveChatMessage, LiveParticipant, LiveSession


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
            "is_admitted",
            "is_mic_on",
            "is_camera_on",
            "is_screen_sharing",
            "hand_raised",
            "is_recording",
            "last_reaction",
            "joined_at",
            "left_at",
        ]


class LiveChatMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = LiveChatMessage
        fields = ["id", "session", "user", "user_name", "content", "created_at"]
        read_only_fields = ["user"]


class LiveSessionSerializer(serializers.ModelSerializer):
    participants = LiveParticipantSerializer(many=True, read_only=True)
    course_title = serializers.SerializerMethodField()
    enrolled_students = serializers.SerializerMethodField()
    instructor_name = serializers.CharField(source="instructor.full_name", read_only=True)
    instructor_id = serializers.UUIDField(source="instructor.id", read_only=True)
    stream_minutes_remaining = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = "__all__"
        read_only_fields = ["instructor", "room_name"]

    def get_course_title(self, obj):
        return obj.course.title if obj.course else None

    def get_enrolled_students(self, obj):
        return obj.course.enrollments.count() if obj.course else 0

    def get_stream_minutes_remaining(self, obj):
        return get_streaming_remaining(obj.instructor)

    def create(self, validated_data):
        validated_data["room_name"] = f"live-{uuid.uuid4().hex[:10]}"
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return data
