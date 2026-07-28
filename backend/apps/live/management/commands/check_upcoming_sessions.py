from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.learning.models import Notification
from apps.learning.notifications import bulk_create_notifications
from apps.live.models import LiveSession

User = get_user_model()


class Command(BaseCommand):
    help = "Create reminder notifications for live sessions starting in ~5 minutes"

    def handle(self, *args, **options):
        now = timezone.now()
        window_start = now
        window_end = now + timedelta(minutes=5)

        upcoming = LiveSession.objects.filter(
            status=LiveSession.Status.SCHEDULED,
            scheduled_at__gte=window_start,
            scheduled_at__lte=window_end,
        )

        count = 0
        for session in upcoming:
            already_notified = Notification.objects.filter(
                notification_type=Notification.Type.LIVE_REMINDER,
                title__contains=session.title,
                created_at__gte=now - timedelta(minutes=10),
            ).exists()
            if already_notified:
                continue

            students = User.objects.filter(
                enrollments__course=session.course,
                enrollments__is_active=True,
            ).distinct()

            if not students.exists():
                continue

            bulk_create_notifications(
                users=students,
                notification_type=Notification.Type.LIVE_REMINDER,
                title=f"Live starting soon: {session.title}",
                body=f"The live session starts at {session.scheduled_at.strftime('%H:%M')}. Get ready!",
                link="/schedule",
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Created reminders for {count} session(s)"))
