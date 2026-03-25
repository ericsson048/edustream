from rest_framework import serializers

from .models import Discussion, DiscussionComment, StudyGroup, StudyGroupMessage


class DiscussionCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = DiscussionComment
        fields = "__all__"
        read_only_fields = ["author"]


class DiscussionSerializer(serializers.ModelSerializer):
    comments = DiscussionCommentSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Discussion
        fields = "__all__"
        read_only_fields = ["author"]


class StudyGroupSerializer(serializers.ModelSerializer):
    members_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = StudyGroup
        fields = "__all__"
        read_only_fields = ["created_by", "members"]


class StudyGroupMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)

    class Meta:
        model = StudyGroupMessage
        fields = "__all__"
        read_only_fields = ["sender"]
