from django.contrib import admin

from .models import LiveParticipant, LiveSession

admin.site.register(LiveSession)
admin.site.register(LiveParticipant)
