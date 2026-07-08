from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.courses.models import Enrollment
from apps.users.models import User
from .models import Conversation, ConversationParticipant, Message
from .serializers import ContactSerializer, ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name"]

    def get_queryset(self):
        return Conversation.objects.filter(participants__user=self.request.user).distinct().prefetch_related("participants", "messages")

    def get_serializer_context(self):
        return {"request": self.request}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        participant, _ = ConversationParticipant.objects.get_or_create(
            conversation=conversation, user=request.user
        )
        participant.last_read_at = timezone.now()
        participant.save(update_fields=["last_read_at"])
        return Response({"status": "ok"})


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["conversation"]

    def get_queryset(self):
        return Message.objects.filter(conversation__participants__user=self.request.user).select_related("sender", "conversation")

    def get_serializer_context(self):
        return {"request": self.request}

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_contacts(request):
    user = request.user
    now = timezone.now()
    contacts_map: dict[str, dict] = {}

    def add(u: User, course_name: str):
        if u.id == user.id:
            return
        if u.id not in contacts_map:
            ls = u.last_seen
            contacts_map[u.id] = {
                "id": u.id,
                "full_name": u.full_name,
                "role": u.role,
                "avatar_url": u.avatar_url or "",
                "title": u.title or "",
                "course_names": [],
                "last_seen": ls,
                "is_online": (now - ls).total_seconds() < 120 if ls else False,
            }
        if course_name and course_name not in contacts_map[u.id]["course_names"]:
            contacts_map[u.id]["course_names"].append(course_name)

    if user.role == "INSTRUCTOR":
        enrollments = Enrollment.objects.filter(course__instructor=user).select_related("student", "course")
        for e in enrollments:
            add(e.student, e.course.title)

    elif user.role == "STUDENT":
        enrolled_courses = Enrollment.objects.filter(student=user).select_related("course")
        course_ids = [e.course_id for e in enrolled_courses]
        course_names = {e.course_id: e.course.title for e in enrolled_courses}

        peers = Enrollment.objects.filter(course_id__in=course_ids).exclude(student=user).select_related("student", "course")
        for e in peers:
            add(e.student, course_names.get(e.course_id, e.course.title))

        instructors = User.objects.filter(courses_taught__id__in=course_ids).distinct()
        for inst in instructors:
            related_courses = Enrollment.objects.filter(course__instructor=inst, course_id__in=course_ids).select_related("course")
            names = list(set(e.course.title for e in related_courses))
            for name in names:
                add(inst, name)

    else:
        all_users = User.objects.filter(is_active=True).order_by("full_name")
        for u in all_users:
            add(u, "")

    return Response(sorted(contacts_map.values(), key=lambda c: c["full_name"]))
