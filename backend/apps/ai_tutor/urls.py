from django.urls import path

from .views import (
    InstructorCourseGenerationView,
    InstructorLessonGenerationView,
    InstructorModuleGenerationView,
    TutorChatView,
)

urlpatterns = [
    path("tutor/chat/", TutorChatView.as_view(), name="ai-tutor-chat"),
    path("instructor/generate-course/", InstructorCourseGenerationView.as_view(), name="ai-instructor-generate-course"),
    path("instructor/generate-module/", InstructorModuleGenerationView.as_view(), name="ai-instructor-generate-module"),
    path("instructor/generate-lesson/", InstructorLessonGenerationView.as_view(), name="ai-instructor-generate-lesson"),
]
