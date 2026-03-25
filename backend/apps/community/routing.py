from django.urls import re_path

from .consumers import CommunityHubConsumer, DiscussionConsumer, StudyGroupConsumer

websocket_urlpatterns = [
    re_path(r"^ws/community/$", CommunityHubConsumer.as_asgi()),
    re_path(r"^ws/community/discussions/(?P<discussion_id>[0-9a-f-]+)/$", DiscussionConsumer.as_asgi()),
    re_path(r"^ws/community/groups/(?P<group_id>[0-9a-f-]+)/$", StudyGroupConsumer.as_asgi()),
]
