import json
import logging
from urllib.request import Request, urlopen

from django.contrib.auth import get_user_model

from .models import Notification, PushDevice

User = get_user_model()
logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _send_expo_push(tokens, title, body, data=None):
    if not tokens:
        return
    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "badge": 1,
        }
        for t in tokens
    ]
    try:
        req = Request(
            EXPO_PUSH_URL,
            data=json.dumps(messages).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=10) as resp:
            resp.read()
    except Exception:
        logger.exception("Expo push send failed")


def _push_for_user(user, title, body, data=None):
    tokens = list(
        PushDevice.objects.filter(user=user).values_list("expo_push_token", flat=True)
    )
    _send_expo_push(tokens, title, body, data)


def _push_for_users(users, title, body, data=None):
    tokens = list(
        PushDevice.objects.filter(user__in=users).values_list("expo_push_token", flat=True)
    )
    _send_expo_push(tokens, title, body, data)


def create_notification(user, notification_type, title, body, link="", send_push=True):
    notif = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        body=body,
        link=link,
    )
    if send_push:
        _push_for_user(user, title, body, {"link": link})
    return notif


def bulk_create_notifications(users, notification_type, title, body, link="", send_push=True):
    notifications = [
        Notification(
            user=user,
            notification_type=notification_type,
            title=title,
            body=body,
            link=link,
        )
        for user in users
    ]
    created = Notification.objects.bulk_create(notifications)
    if send_push:
        _push_for_users(users, title, body, {"link": link})
    return created
