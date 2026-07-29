import os
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.billing.services import can_stream_live
from apps.courses.models import Enrollment

from .models import LiveChatMessage, LiveParticipant, LiveSession
from .serializers import LiveChatMessageSerializer, LiveParticipantSerializer, LiveSessionSerializer

User = get_user_model()


def _is_host_or_cohost(user, session):
    return LiveParticipant.objects.filter(
        session=session, user=user,
        role__in=[LiveParticipant.Role.HOST, LiveParticipant.Role.CO_HOST],
        left_at__isnull=True,
    ).exists()


class LiveSessionViewSet(viewsets.ModelViewSet):
    queryset = LiveSession.objects.select_related("course", "instructor")
    serializer_class = LiveSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "status"]

    def _auto_end_stale_sessions(self):
        now = timezone.now()
        stale = LiveSession.objects.filter(status=LiveSession.Status.LIVE)
        stale_ids = []
        for s in stale:
            if s.scheduled_at and now > s.scheduled_at + timezone.timedelta(minutes=s.duration_minutes):
                stale_ids.append(s.id)
        if stale_ids:
            LiveSession.objects.filter(id__in=stale_ids).update(status=LiveSession.Status.ENDED)

    @action(detail=False, methods=["get"], url_path="ice-config")
    def ice_config(self, request):
        stun_urls = getattr(settings, "WEBRTC_STUN_URLS", ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"])
        turn_urls = getattr(settings, "WEBRTC_TURN_URLS", [])
        turn_username = getattr(settings, "WEBRTC_TURN_USERNAME", "")
        turn_credential = getattr(settings, "WEBRTC_TURN_CREDENTIAL", "")
        ice_servers = [{"urls": stun_urls}]
        if turn_urls:
            ice_servers.append({"urls": turn_urls, "username": turn_username, "credential": turn_credential})
        return Response({"iceServers": ice_servers})

    def list(self, request, *args, **kwargs):
        self._auto_end_stale_sessions()
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == "ADMIN":
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(instructor=self.request.user)
        return qs.filter(course__enrollments__student=self.request.user).distinct()

    def perform_create(self, serializer):
        if self.request.user.role not in {"INSTRUCTOR", "ADMIN"}:
            raise PermissionDenied("Instructor role required.")
        if not can_stream_live(self.request.user):
            raise PermissionDenied("Unlimited streaming plan required.")
        session = serializer.save(instructor=self.request.user)
        self._notify_enrolled_students(session)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        session = serializer.save()
        if old_status != LiveSession.Status.LIVE and session.status == LiveSession.Status.LIVE:
            self._notify_session_started(session)

    def _notify_session_started(self, session):
        from apps.learning.notifications import bulk_create_notifications
        from apps.learning.models import Notification

        students = User.objects.filter(
            enrollments__course=session.course,
            enrollments__is_active=True,
        ).distinct()
        bulk_create_notifications(
            users=students,
            notification_type=Notification.Type.LIVE_SESSION,
            title=f"Live now: {session.title}",
            body=f"The live session has started. Join now!",
            link="/schedule",
        )

    def _notify_enrolled_students(self, session):
        from apps.courses.models import Enrollment
        from apps.learning.notifications import bulk_create_notifications
        from apps.learning.models import Notification

        students = User.objects.filter(
            enrollments__course=session.course,
            enrollments__is_active=True,
        ).distinct()
        bulk_create_notifications(
            users=students,
            notification_type=Notification.Type.LIVE_SESSION,
            title=f"Live session scheduled: {session.title}",
            body=f"A live session has been scheduled for {session.scheduled_at.strftime('%B %d, %Y at %H:%M')}.",
            link="/schedule",
        )

    def _send_group(self, session_id, payload, sender_id=""):
        from channels.layers import get_channel_layer
        import asyncio
        channel_layer = get_channel_layer()
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    pool.submit(
                        channel_layer.group_send,
                        f"live_{session_id}",
                        {"type": "room.event", "payload": payload, "sender_id": str(sender_id)},
                    )
            else:
                loop.run_until_complete(
                    channel_layer.group_send(
                        f"live_{session_id}",
                        {"type": "room.event", "payload": payload, "sender_id": str(sender_id)},
                    )
                )
        except Exception:
            pass

    @action(detail=True, methods=["post"], url_path="end")
    def end_session(self, request, pk=None):
        session = self.get_object()
        if not _is_host_or_cohost(request.user, session) and request.user.role != "ADMIN":
            return Response({"detail": "Only the host or co-host can end the session."}, status=status.HTTP_403_FORBIDDEN)
        LiveParticipant.objects.filter(session=session, left_at__isnull=True).update(
            left_at=timezone.now(),
            is_screen_sharing=False,
            hand_raised=False,
            is_recording=False,
            last_reaction="",
        )
        session.status = LiveSession.Status.ENDED
        session.save(update_fields=["status"])
        self._send_group(session.id, {"kind": "session_ended"}, request.user.id)
        return Response({"detail": "Session ended.", "status": session.status})

    @action(detail=True, methods=["post"], url_path="join")
    def join(self, request, pk=None):
        session = self.get_object()

        if request.user == session.instructor:
            role = LiveParticipant.Role.HOST
            is_admitted = True
            if session.status == LiveSession.Status.SCHEDULED:
                session.status = LiveSession.Status.LIVE
                session.save(update_fields=["status"])
                self._notify_session_started(session)
                self._send_group(session.id, {"kind": "session_live", "status": "LIVE"}, request.user.id)
        else:
            is_enrolled = Enrollment.objects.filter(student=request.user, course=session.course, is_active=True).exists()
            if not is_enrolled:
                return Response({"detail": "Enrollment required."}, status=status.HTTP_403_FORBIDDEN)

            existing = LiveParticipant.objects.filter(session=session, user=request.user).first()
            if existing and existing.role == LiveParticipant.Role.CO_HOST:
                role = LiveParticipant.Role.CO_HOST
                is_admitted = True
            else:
                role = LiveParticipant.Role.STUDENT
                is_admitted = not session.requires_permission

        if session.status == LiveSession.Status.ENDED:
            return Response({"detail": "Session has ended."}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = LiveParticipant.objects.get_or_create(
            session=session,
            user=request.user,
            defaults={"role": role, "is_admitted": is_admitted},
        )
        if not created:
            participant.role = role
            participant.left_at = None
            if role in (LiveParticipant.Role.HOST, LiveParticipant.Role.CO_HOST):
                participant.is_admitted = True
            participant.save(update_fields=["role", "left_at", "is_admitted"])

        result = LiveParticipantSerializer(participant).data
        result["is_admitted"] = participant.is_admitted
        return Response(result)

    @action(detail=True, methods=["post"], url_path="request-entry")
    def request_entry(self, request, pk=None):
        session = self.get_object()
        if session.status not in (LiveSession.Status.LIVE,):
            return Response({"detail": "Session is not live."}, status=status.HTTP_400_BAD_REQUEST)

        participant = LiveParticipant.objects.filter(session=session, user=request.user).first()
        if not participant:
            is_enrolled = Enrollment.objects.filter(student=request.user, course=session.course, is_active=True).exists()
            if not is_enrolled:
                return Response({"detail": "Enrollment required."}, status=status.HTTP_403_FORBIDDEN)
            participant = LiveParticipant.objects.create(
                session=session, user=request.user, role=LiveParticipant.Role.STUDENT, is_admitted=False,
            )
        elif participant.is_admitted:
            return Response({"detail": "Already admitted."}, status=status.HTTP_400_BAD_REQUEST)

        self._send_group(session.id, {
            "kind": "entry_requested",
            "participant": LiveParticipantSerializer(participant).data,
        }, request.user.id)
        return Response({"status": "pending"})

    @action(detail=True, methods=["post"], url_path="grant-entry")
    def grant_entry(self, request, pk=None):
        session = self.get_object()
        if not _is_host_or_cohost(request.user, session) and request.user.role != "ADMIN":
            return Response({"detail": "Only host or co-host can grant entry."}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        participant = get_object_or_404(LiveParticipant, session=session, user_id=user_id)
        participant.is_admitted = True
        participant.save(update_fields=["is_admitted"])

        self._send_group(session.id, {
            "kind": "entry_granted",
            "participant": LiveParticipantSerializer(participant).data,
        }, request.user.id)
        return Response(LiveParticipantSerializer(participant).data)

    @action(detail=True, methods=["post"], url_path="deny-entry")
    def deny_entry(self, request, pk=None):
        session = self.get_object()
        if not _is_host_or_cohost(request.user, session) and request.user.role != "ADMIN":
            return Response({"detail": "Only host or co-host can deny entry."}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        LiveParticipant.objects.filter(session=session, user_id=user_id, is_admitted=False).delete()
        self._send_group(session.id, {
            "kind": "entry_denied",
            "user_id": str(user_id),
        }, request.user.id)
        return Response({"status": "denied"})

    @action(detail=True, methods=["post"], url_path="send-to-waiting")
    def send_to_waiting(self, request, pk=None):
        session = self.get_object()
        if not _is_host_or_cohost(request.user, session) and request.user.role != "ADMIN":
            return Response({"detail": "Only host or co-host can send to waiting."}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        participant = get_object_or_404(LiveParticipant, session=session, user_id=user_id)
        if participant.role in (LiveParticipant.Role.HOST, LiveParticipant.Role.CO_HOST):
            return Response({"detail": "Cannot send host or co-host to waiting."}, status=status.HTTP_400_BAD_REQUEST)

        participant.is_admitted = False
        participant.is_mic_on = False
        participant.is_camera_on = False
        participant.is_screen_sharing = False
        participant.save(update_fields=["is_admitted", "is_mic_on", "is_camera_on", "is_screen_sharing"])

        self._send_group(session.id, {
            "kind": "sent_to_waiting",
            "participant": LiveParticipantSerializer(participant).data,
        }, request.user.id)
        return Response(LiveParticipantSerializer(participant).data)

    @action(detail=True, methods=["post"], url_path="add-cohost")
    def add_cohost(self, request, pk=None):
        session = self.get_object()
        if request.user != session.instructor and request.user.role != "ADMIN":
            return Response({"detail": "Only the host can add co-hosts."}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = LiveParticipant.objects.get_or_create(
            session=session, user_id=user_id,
            defaults={"role": LiveParticipant.Role.CO_HOST, "is_admitted": True},
        )
        if not created:
            participant.role = LiveParticipant.Role.CO_HOST
            participant.is_admitted = True
            participant.save(update_fields=["role", "is_admitted"])

        self._send_group(session.id, {
            "kind": "cohost_added",
            "participant": LiveParticipantSerializer(participant).data,
        }, request.user.id)
        return Response(LiveParticipantSerializer(participant).data)

    @action(detail=True, methods=["get"], url_path="pending-entries")
    def pending_entries(self, request, pk=None):
        session = self.get_object()
        if not _is_host_or_cohost(request.user, session) and request.user.role != "ADMIN":
            return Response({"detail": "Only host or co-host can view pending entries."}, status=status.HTTP_403_FORBIDDEN)

        pending = LiveParticipant.objects.filter(
            session=session, is_admitted=False, left_at__isnull=True,
        ).select_related("user")
        return Response(LiveParticipantSerializer(pending, many=True).data)

    @action(detail=True, methods=["post"], url_path="upload-recording", parser_classes=[MultiPartParser, FormParser])
    def upload_recording(self, request, pk=None):
        session = self.get_object()
        if request.user != session.instructor and request.user.role != "ADMIN":
            return Response({"detail": "Only the host can upload recordings."}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(file.name)[1] or ".webm"
        filename = f"recordings/{session.id}/{uuid.uuid4()}{ext}"
        path = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb+") as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        session.recording_file.name = filename
        session.save(update_fields=["recording_file"])
        url = f"{settings.MEDIA_URL}{filename}"
        return Response({"url": url, "file": filename}, status=status.HTTP_201_CREATED)


class LiveParticipantViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LiveParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["session", "role"]

    def get_queryset(self):
        session_id = self.request.query_params.get("session")
        session = get_object_or_404(LiveSession, id=session_id)
        if self.request.user != session.instructor and self.request.user.role != "ADMIN":
            if not Enrollment.objects.filter(student=self.request.user, course=session.course, is_active=True).exists():
                return LiveParticipant.objects.none()
        return LiveParticipant.objects.filter(session=session, left_at__isnull=True).select_related("user")


class LiveChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = LiveChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.request.query_params.get("session")
        if not session_id:
            return LiveChatMessage.objects.none()
        session = get_object_or_404(LiveSession, id=session_id)
        if self.request.user != session.instructor and self.request.user.role != "ADMIN":
            if not Enrollment.objects.filter(student=self.request.user, course=session.course, is_active=True).exists():
                return LiveChatMessage.objects.none()
        return LiveChatMessage.objects.filter(session=session).select_related("user")[:100]

    def perform_create(self, serializer):
        session_id = self.request.data.get("session") or self.request.query_params.get("session")
        session = get_object_or_404(LiveSession, id=session_id)
        serializer.save(user=self.request.user, session=session)
