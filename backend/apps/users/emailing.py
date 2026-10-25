import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_template_email(subject, to_email, plain_text, html_text=None, fail_silently=True):
    try:
        sent_count = send_mail(
            subject=subject,
            message=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_text,
            fail_silently=fail_silently,
        )
        if not sent_count:
            logger.warning("Email was not delivered to %s", to_email)
        if not sent_count and not fail_silently:
            raise RuntimeError("Email backend did not deliver the message.")
        return bool(sent_count)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        if not fail_silently:
            raise
        return False
