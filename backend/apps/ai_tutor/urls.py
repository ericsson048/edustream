from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InstructorCourseGenerationView,
    InstructorLessonGenerationView,
    InstructorModuleGenerationView,
    TutorChatView,
    TutorConversationViewSet,
    TutorMessageViewSet,
    TutorReasoningChatView,
)

router = DefaultRouter()
router.register(r"tutor/conversations", TutorConversationViewSet, basename="ai-conversation")
router.register(r"tutor/messages", TutorMessageViewSet, basename="ai-message")

urlpatterns = [
    path("tutor/chat/", TutorChatView.as_view(), name="ai-tutor-chat"),
    path("tutor/reasoning/", TutorReasoningChatView.as_view(), name="ai-tutor-reasoning"),
    path("instructor/generate-course/", InstructorCourseGenerationView.as_view(), name="ai-instructor-generate-course"),
    path("instructor/generate-module/", InstructorModuleGenerationView.as_view(), name="ai-instructor-generate-module"),
    path("instructor/generate-lesson/", InstructorLessonGenerationView.as_view(), name="ai-instructor-generate-lesson"),
    path("", include(router.urls)),
]
