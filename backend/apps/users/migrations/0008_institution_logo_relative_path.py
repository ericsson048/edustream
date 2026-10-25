from urllib.parse import urlsplit

from django.db import migrations, models


def normalize_uploaded_logo_urls(apps, schema_editor):
    Institution = apps.get_model("users", "Institution")
    for institution in Institution.objects.exclude(logo_url="").iterator():
        parsed = urlsplit(institution.logo_url)
        if parsed.path.startswith("/media/uploads/"):
            institution.logo_url = parsed.path
            institution.save(update_fields=["logo_url"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0007_user_created_by_user_must_change_password_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="institution",
            name="logo_url",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.RunPython(normalize_uploaded_logo_urls, migrations.RunPython.noop),
    ]
