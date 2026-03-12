from django.contrib import admin

from .models import Certificate, Course, Enrollment, Lesson, Module, Note, Progress, Resource

admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Lesson)
admin.site.register(Resource)
admin.site.register(Enrollment)
admin.site.register(Progress)
admin.site.register(Note)
admin.site.register(Certificate)
