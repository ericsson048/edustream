# Generated manually

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSetting",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("key", models.CharField(max_length=255, unique=True)),
                ("value", models.TextField(blank=True, default="")),
            ],
            options={
                "ordering": ["key"],
            },
        ),
        migrations.CreateModel(
            name="SupportTicket",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("subject", models.CharField(max_length=255)),
                ("message", models.TextField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("OPEN", "Open"),
                            ("IN_PROGRESS", "In Progress"),
                            ("RESOLVED", "Resolved"),
                        ],
                        default="OPEN",
                        max_length=20,
                    ),
                ),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("LOW", "Low"),
                            ("MEDIUM", "Medium"),
                            ("HIGH", "High"),
                        ],
                        default="MEDIUM",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="support_tickets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
