from django.urls import path

from .views import InstructorCourseGenerationView, TutorChatView

urlpatterns = [
    path("tutor/chat/", TutorChatView.as_view(), name="ai-tutor-chat"),
    path("instructor/generate-course/", InstructorCourseGenerationView.as_view(), name="ai-instructor-generate-course"),
]
