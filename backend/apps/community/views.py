from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Discussion, DiscussionComment, StudyGroup
from .serializers import DiscussionCommentSerializer, DiscussionSerializer, StudyGroupSerializer


class DiscussionViewSet(viewsets.ModelViewSet):
    queryset = Discussion.objects.select_related("author", "course").prefetch_related("comments")
    serializer_class = DiscussionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "category"]
    search_fields = ["title", "content", "tags"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class DiscussionCommentViewSet(viewsets.ModelViewSet):
    queryset = DiscussionComment.objects.select_related("discussion", "author")
    serializer_class = DiscussionCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["discussion"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class StudyGroupViewSet(viewsets.ModelViewSet):
    queryset = StudyGroup.objects.prefetch_related("members").all()
    serializer_class = StudyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "description"]

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        group.members.add(self.request.user)

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        group = self.get_object()
        group.members.add(request.user)
        return Response({"joined": True, "members_count": group.members.count()})
