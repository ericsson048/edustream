import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Discussion, StudyGroup, StudyGroupMessage
from .serializers import StudyGroupMessageSerializer


class CommunityHubConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        self.room_group_name = "community_global"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps(event["event"]))


class DiscussionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        self.discussion_id = self.scope["url_route"]["kwargs"]["discussion_id"]
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        exists = await self._discussion_exists(self.discussion_id)
        if not exists:
            await self.close(code=4404)
            return
        self.room_group_name = f"discussion_{self.discussion_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps(event["event"]))

    @sync_to_async
    def _discussion_exists(self, discussion_id):
        return Discussion.objects.filter(id=discussion_id).exists()


class StudyGroupConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        has_access = await self._has_access(user.id, self.group_id)
        if not has_access:
            await self.close(code=4403)
            return
        self.room_group_name = f"study_group_{self.group_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        payload = json.loads(text_data)
        content = (payload.get("content") or "").strip()
        if not content:
            return
        message = await self._create_message(self.group_id, self.scope["user"].id, content)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast.event",
                "event": {
                    "kind": "study_group_message_created",
                    "message": message,
                },
            },
        )

    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps(event["event"]))

    @sync_to_async
    def _has_access(self, user_id, group_id):
        return StudyGroup.objects.filter(id=group_id, members__id=user_id).exists()

    @sync_to_async
    def _create_message(self, group_id, user_id, content):
        message = StudyGroupMessage.objects.create(group_id=group_id, sender_id=user_id, content=content)
        return StudyGroupMessageSerializer(message).data
