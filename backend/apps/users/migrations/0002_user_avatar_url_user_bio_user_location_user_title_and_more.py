# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="user",
            name="bio",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="user",
            name="location",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="title",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Professional headline (e.g. Senior Frontend Engineer & Educator)",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="website",
            field=models.URLField(blank=True, default=""),
        ),
    ]
