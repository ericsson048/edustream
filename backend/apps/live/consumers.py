import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from apps.courses.models import Enrollment

from .models import LiveParticipant, LiveSession
from .serializers import LiveParticipantSerializer


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
        participant = await self._mark_joined(user.id, self.session_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "room.event",
                "payload": {
                    "kind": "participant_joined",
                    "participant": participant,
                },
                "sender_id": str(user.id),
            },
        )

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            participant = await self._mark_left(user.id, self.session_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "kind": "participant_left",
                        "participant": participant,
                    },
                    "sender_id": str(user.id),
                },
            )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        payload = json.loads(text_data)
        kind = payload.get("kind")
        user = self.scope["user"]

        if kind == "participant_state":
            participant = await self._update_participant_state(
                user.id,
                self.session_id,
                {
                    "is_mic_on": payload.get("is_mic_on"),
                    "is_camera_on": payload.get("is_camera_on"),
                    "is_screen_sharing": payload.get("is_screen_sharing"),
                    "hand_raised": payload.get("hand_raised"),
                    "is_recording": payload.get("is_recording"),
                },
            )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "kind": "participant_state",
                        "participant": participant,
                    },
                    "sender_id": str(user.id),
                },
            )
            return

        if kind == "reaction":
            reaction = str(payload.get("reaction") or "").strip()[:16]
            if not reaction:
                return
            participant = await self._set_reaction(user.id, self.session_id, reaction)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "kind": "reaction",
                        "participant": participant,
                        "reaction": reaction,
                    },
                    "sender_id": str(user.id),
                },
            )
            return

        if kind == "chat_message":
            content = str(payload.get("content") or "").strip()
            if not content:
                return
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "kind": "chat_message",
                        "content": content,
                        "user_id": str(user.id),
                        "user_name": user.full_name,
                    },
                    "sender_id": str(user.id),
                },
            )
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "room.event",
                "payload": payload,
                "sender_id": str(user.id),
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
        if user.id == session.instructor.id or getattr(user, "role", None) == "ADMIN":
            return True
        return Enrollment.objects.filter(student_id=user_id, course=session.course, is_active=True).exists()

    @sync_to_async
    def _mark_joined(self, user_id, session_id):
        session = LiveSession.objects.get(id=session_id)
        role = LiveParticipant.Role.HOST if session.instructor_id == user_id else LiveParticipant.Role.STUDENT
        participant, _ = LiveParticipant.objects.select_related("user").get_or_create(
            session=session,
            user_id=user_id,
            defaults={"role": role},
        )
        participant.role = role
        participant.left_at = None
        participant.save(update_fields=["role", "left_at"])
        return LiveParticipantSerializer(participant).data

    @sync_to_async
    def _mark_left(self, user_id, session_id):
        try:
            participant = LiveParticipant.objects.select_related("user").get(session_id=session_id, user_id=user_id)
        except LiveParticipant.DoesNotExist:
            return {"session": str(session_id), "user": str(user_id)}
        participant.left_at = timezone.now()
        participant.is_screen_sharing = False
        participant.hand_raised = False
        participant.is_recording = False
        participant.last_reaction = ""
        participant.save(update_fields=["left_at", "is_screen_sharing", "hand_raised", "is_recording", "last_reaction"])
        return LiveParticipantSerializer(participant).data

    @sync_to_async
    def _update_participant_state(self, user_id, session_id, raw_state):
        participant = LiveParticipant.objects.select_related("user").get(session_id=session_id, user_id=user_id)
        updated_fields = []
        for field, value in raw_state.items():
            if value is None:
                continue
            setattr(participant, field, bool(value))
            updated_fields.append(field)
        if updated_fields:
            participant.save(update_fields=updated_fields)
        return LiveParticipantSerializer(participant).data

    @sync_to_async
    def _set_reaction(self, user_id, session_id, reaction):
        participant = LiveParticipant.objects.select_related("user").get(session_id=session_id, user_id=user_id)
        participant.last_reaction = reaction
        participant.save(update_fields=["last_reaction"])
        return LiveParticipantSerializer(participant).data
