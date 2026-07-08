import json
from uuid import UUID

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from .models import Conversation, Message
from .serializers import MessageSerializer


def _serialize_for_channel(data):
    if isinstance(data, dict):
        return {k: _serialize_for_channel(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_serialize_for_channel(v) for v in data]
    if isinstance(data, UUID):
        return str(data)
    return data


class ConversationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        has_access = await self._has_access(user.id, self.conversation_id)
        if not has_access:
            await self.close(code=4403)
            return
        self.room_group_name = f"conversation_{self.conversation_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self._update_last_seen(user.id)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        user = self.scope["user"]
        payload = json.loads(text_data)
        kind = payload.get("kind", "message")
        if kind == "message":
            content = (payload.get("content") or "").strip()
            if not content:
                return
            message = await self._create_message(self.conversation_id, user.id, content)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "conversation.message",
                    "message": _serialize_for_channel(message),
                },
            )

    async def conversation_message(self, event):
        await self.send(text_data=json.dumps({"kind": "message_created", "message": event["message"]}))

    @sync_to_async
    def _has_access(self, user_id, conversation_id):
        return Conversation.objects.filter(id=conversation_id, participants__user_id=user_id).exists()

    @sync_to_async
    def _update_last_seen(self, user_id):
        from apps.users.models import User
        User.objects.filter(id=user_id).update(last_seen=timezone.now())

    @sync_to_async
    def _create_message(self, conversation_id, user_id, content):
        message = Message.objects.create(conversation_id=conversation_id, sender_id=user_id, content=content)
        return MessageSerializer(message).data
