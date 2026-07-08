from django.utils import timezone
from rest_framework import serializers

from .models import Conversation, ConversationParticipant, Message

def user_is_online(user):
    if not user.last_seen:
        return False
    return (timezone.now() - user.last_seen).total_seconds() < 120


class ContactSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    role = serializers.CharField()
    avatar_url = serializers.URLField(required=False, allow_blank=True)
    title = serializers.CharField(required=False, allow_blank=True)
    course_names = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    last_seen = serializers.DateTimeField(read_only=True, allow_null=True)
    is_online = serializers.SerializerMethodField()

    def get_is_online(self, obj):
        ls = obj.get("last_seen")
        if not ls:
            return False
        return (timezone.now() - ls).total_seconds() < 120


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ["sender"]

    def get_is_read(self, obj):
        user = self.context.get("request").user if "request" in self.context else None
        if not user or obj.sender_id == user.id:
            return True
        participant = ConversationParticipant.objects.filter(
            conversation=obj.conversation, user=obj.sender
        ).first()
        if participant and participant.last_read_at:
            return obj.created_at <= participant.last_read_at
        return False


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = ConversationParticipant
        fields = "__all__"

    def get_is_online(self, obj):
        return (timezone.now() - obj.user.last_seen).total_seconds() < 120 if obj.user.last_seen else False


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participant_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)

    class Meta:
        model = Conversation
        fields = "__all__"
        read_only_fields = ["created_by"]

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        conversation = super().create(validated_data)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            ConversationParticipant.objects.get_or_create(conversation=conversation, user=request.user)
        for uid in participant_ids:
            if request and uid == request.user.id:
                continue
            ConversationParticipant.objects.get_or_create(conversation=conversation, user_id=uid)
        return conversation

    def get_latest_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        return MessageSerializer(message, context=self.context).data if message else None

    def get_unread_count(self, obj):
        user = self.context.get("request").user if "request" in self.context else None
        if not user:
            return 0
        participant = obj.participants.filter(user=user).first()
        if not participant or not participant.last_read_at:
            return obj.messages.exclude(sender=user).count()
        return obj.messages.filter(created_at__gt=participant.last_read_at).exclude(sender=user).count()
