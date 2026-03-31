from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("live", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="liveparticipant",
            name="hand_raised",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="liveparticipant",
            name="is_camera_on",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="liveparticipant",
            name="is_mic_on",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="liveparticipant",
            name="is_recording",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="liveparticipant",
            name="is_screen_sharing",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="liveparticipant",
            name="last_reaction",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
    ]
