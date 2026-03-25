from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Discussion, DiscussionComment, StudyGroup, StudyGroupMessage
from .serializers import DiscussionCommentSerializer, DiscussionSerializer, StudyGroupMessageSerializer, StudyGroupSerializer


def broadcast(group_name, event):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "broadcast.event",
            "event": event,
        },
    )


class DiscussionViewSet(viewsets.ModelViewSet):
    queryset = Discussion.objects.select_related("author", "course").prefetch_related("comments")
    serializer_class = DiscussionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "category"]
    search_fields = ["title", "content", "tags"]

    def perform_create(self, serializer):
        discussion = serializer.save(author=self.request.user)
        broadcast(
            "community_global",
            {
                "kind": "discussion_created",
                "discussion": DiscussionSerializer(discussion, context={"request": self.request}).data,
            },
        )


class DiscussionCommentViewSet(viewsets.ModelViewSet):
    queryset = DiscussionComment.objects.select_related("discussion", "author")
    serializer_class = DiscussionCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["discussion"]

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        broadcast(
            f"discussion_{comment.discussion_id}",
            {
                "kind": "discussion_comment_created",
                "comment": DiscussionCommentSerializer(comment, context={"request": self.request}).data,
            },
        )


class StudyGroupViewSet(viewsets.ModelViewSet):
    queryset = StudyGroup.objects.prefetch_related("members").all()
    serializer_class = StudyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "description"]

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        group.members.add(self.request.user)
        broadcast(
            "community_global",
            {
                "kind": "study_group_created",
                "group": StudyGroupSerializer(group, context={"request": self.request}).data,
            },
        )

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        group = self.get_object()
        group.members.add(request.user)
        broadcast(
            f"study_group_{group.id}",
            {
                "kind": "study_group_member_joined",
                "group_id": str(group.id),
                "user_id": str(request.user.id),
                "user_name": request.user.full_name,
            },
        )
        return Response({"joined": True, "members_count": group.members.count()})


class StudyGroupMessageViewSet(viewsets.ModelViewSet):
    serializer_class = StudyGroupMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["group"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return StudyGroupMessage.objects.filter(group__members=self.request.user).select_related("group", "sender")

    def perform_create(self, serializer):
        group = serializer.validated_data["group"]
        if not group.members.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Study group membership required.")
        message = serializer.save(sender=self.request.user)
        broadcast(
            f"study_group_{group.id}",
            {
                "kind": "study_group_message_created",
                "message": StudyGroupMessageSerializer(message, context={"request": self.request}).data,
            },
        )
