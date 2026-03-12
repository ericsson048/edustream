import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from apps.billing.services import can_stream_live
from apps.courses.models import Enrollment

from .models import LiveSession


class LiveSessionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.room_group_name = f"live_{self.session_id}"
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        allowed = await self._has_access(user.id, self.session_id)
        if not allowed:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        payload = json.loads(text_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "room.event",
                "payload": payload,
                "sender_id": str(self.scope["user"].id),
            },
        )

    async def room_event(self, event):
        await self.send(text_data=json.dumps({"payload": event["payload"], "sender_id": event["sender_id"]}))

    @sync_to_async
    def _has_access(self, user_id, session_id):
        try:
            session = LiveSession.objects.select_related("instructor", "course").get(id=session_id)
        except LiveSession.DoesNotExist:
            return False

        user = self.scope["user"]
        if user.id == session.instructor.id:
            return can_stream_live(user)
        return Enrollment.objects.filter(student_id=user_id, course=session.course, is_active=True).exists()
