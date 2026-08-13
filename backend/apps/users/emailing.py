import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_template_email(subject, to_email, plain_text, html_text=None):
    try:
        send_mail(
            subject=subject,
            message=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_text,
            fail_silently=True,
        )
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
