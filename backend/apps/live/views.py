from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.billing.services import can_stream_live
from apps.courses.models import Enrollment

from .models import LiveParticipant, LiveSession
from .serializers import LiveParticipantSerializer, LiveSessionSerializer


class LiveSessionViewSet(viewsets.ModelViewSet):
    queryset = LiveSession.objects.select_related("course", "instructor")
    serializer_class = LiveSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == "ADMIN":
            return qs
        if self.request.user.role == "INSTRUCTOR":
            return qs.filter(instructor=self.request.user)
        return qs.filter(course__enrollments__student=self.request.user).distinct()

    def perform_create(self, serializer):
        if self.request.user.role not in {"INSTRUCTOR", "ADMIN"}:
            raise permissions.PermissionDenied("Instructor role required.")
        if not can_stream_live(self.request.user):
            raise permissions.PermissionDenied("Unlimited streaming plan required.")
        serializer.save(instructor=self.request.user)

    @action(detail=True, methods=["post"], url_path="join")
    def join(self, request, pk=None):
        session = self.get_object()
        if request.user == session.instructor:
            role = LiveParticipant.Role.HOST
        else:
            is_enrolled = Enrollment.objects.filter(student=request.user, course=session.course, is_active=True).exists()
            if not is_enrolled:
                return Response({"detail": "Enrollment required."}, status=status.HTTP_403_FORBIDDEN)
            role = LiveParticipant.Role.STUDENT
        participant, _ = LiveParticipant.objects.get_or_create(session=session, user=request.user, defaults={"role": role})
        return Response(LiveParticipantSerializer(participant).data)


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
        return LiveParticipant.objects.filter(session=session).select_related("user")
