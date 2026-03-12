from rest_framework import permissions, viewsets

from .models import Conversation, ConversationParticipant, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name"]

    def get_queryset(self):
        return Conversation.objects.filter(participants__user=self.request.user).distinct().prefetch_related("participants", "messages")

    def perform_create(self, serializer):
        conversation = serializer.save(created_by=self.request.user)
        ConversationParticipant.objects.get_or_create(conversation=conversation, user=self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["conversation"]

    def get_queryset(self):
        return Message.objects.filter(conversation__participants__user=self.request.user).select_related("sender", "conversation")

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
