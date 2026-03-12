from django.contrib import admin

from .models import Assignment, Notification, Quiz, QuizAttempt, QuizQuestion, Submission

admin.site.register(Assignment)
admin.site.register(Submission)
admin.site.register(Quiz)
admin.site.register(QuizQuestion)
admin.site.register(QuizAttempt)
admin.site.register(Notification)
