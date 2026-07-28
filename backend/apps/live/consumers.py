import json
import uuid

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from apps.courses.models import Enrollment

from .models import LiveChatMessage, LiveParticipant, LiveSession
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

        self.user_id = str(user.id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        session_status = await self._get_session_status(self.session_id)
        is_host = await self._is_host(user.id, self.session_id)

        if session_status in (LiveSession.Status.ENDED, LiveSession.Status.SCHEDULED):
            await self.send(text_data=json.dumps({
                "payload": {"kind": "session_not_available", "status": session_status},
                "sender_id": "",
            }))
            await self.close(code=4404)
            return

        if is_host:
            participant = await self._mark_joined(user.id, self.session_id)
        else:
            requires_perm = await self._session_requires_permission(self.session_id)
            admitted = not requires_perm
            participant = await self._mark_joined_with_admission(user.id, self.session_id, admitted)

        await self._cleanup_stale_participants(user.id, self.session_id)

        if not is_host and participant:
            import json as _json
            participant_data = _json.loads(participant) if isinstance(participant, str) else participant
            if not participant_data.get("is_admitted", True):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "room.event",
                        "payload": {
                            "kind": "entry_requested",
                            "participant": participant_data,
                        },
                        "sender_id": str(user.id),
                    },
                )
                return

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
        user_id = getattr(self, "user_id", None)
        session_id = getattr(self, "session_id", None)
        if user_id and session_id:
            participant = await self._mark_left(user_id, session_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "kind": "participant_left",
                        "participant": participant,
                    },
                    "sender_id": user_id,
                },
            )
        if hasattr(self, "room_group_name"):
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
            await self._save_chat_message(user.id, self.session_id, content)
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

        if kind == "mute_all":
            if user.id != await self._get_session_host_id(self.session_id):
                return
            await self._mute_all_participants(self.session_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room.event",
                    "payload": {"kind": "mute_all"},
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

    @staticmethod
    def _serialize(participant_data: dict) -> dict:
        """Convert UUID objects to strings for channel layer serialization."""
        result = {}
        for key, value in participant_data.items():
            if isinstance(value, uuid.UUID):
                result[key] = str(value)
            else:
                result[key] = value
        return result

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
        return self._serialize(LiveParticipantSerializer(participant).data)

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
        return self._serialize(LiveParticipantSerializer(participant).data)

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
        return self._serialize(LiveParticipantSerializer(participant).data)

    @sync_to_async
    def _set_reaction(self, user_id, session_id, reaction):
        participant = LiveParticipant.objects.select_related("user").get(session_id=session_id, user_id=user_id)
        participant.last_reaction = reaction
        participant.save(update_fields=["last_reaction"])
        return self._serialize(LiveParticipantSerializer(participant).data)

    @sync_to_async
    def _save_chat_message(self, user_id, session_id, content):
        LiveChatMessage.objects.create(user_id=user_id, session_id=session_id, content=content)

    @sync_to_async
    def _get_session_host_id(self, session_id):
        try:
            session = LiveSession.objects.get(id=session_id)
            return session.instructor_id
        except LiveSession.DoesNotExist:
            return None

    @sync_to_async
    def _mute_all_participants(self, session_id):
        LiveParticipant.objects.filter(session_id=session_id, left_at__isnull=True).update(is_mic_on=False)

    @sync_to_async
    def _cleanup_stale_participants(self, current_user_id, session_id):
        """Mark all participants except the current user as left if left_at is null.
        This handles cases where previous WebSocket connections died without a clean disconnect."""
        stale = LiveParticipant.objects.filter(
            session_id=session_id, left_at__isnull=True
        ).exclude(user_id=current_user_id)
        if stale.exists():
            now = timezone.now()
            stale.update(
                left_at=now,
                is_screen_sharing=False,
                hand_raised=False,
                is_recording=False,
                last_reaction="",
            )

    @sync_to_async
    def _get_session_status(self, session_id):
        try:
            return LiveSession.objects.values_list("status", flat=True).get(id=session_id)
        except LiveSession.DoesNotExist:
            return None

    @sync_to_async
    def _is_host(self, user_id, session_id):
        return LiveSession.objects.filter(id=session_id, instructor_id=user_id).exists()

    @sync_to_async
    def _session_requires_permission(self, session_id):
        return LiveSession.objects.values_list("requires_permission", flat=True).get(id=session_id)

    @sync_to_async
    def _mark_joined_with_admission(self, user_id, session_id, admitted):
        session = LiveSession.objects.get(id=session_id)
        role = LiveParticipant.Role.HOST if session.instructor_id == user_id else LiveParticipant.Role.STUDENT
        participant, _ = LiveParticipant.objects.select_related("user").get_or_create(
            session=session,
            user_id=user_id,
            defaults={"role": role, "is_admitted": admitted},
        )
        participant.role = role
        participant.is_admitted = admitted
        participant.left_at = None
        participant.save(update_fields=["role", "left_at", "is_admitted"])
        return self._serialize(LiveParticipantSerializer(participant).data)
