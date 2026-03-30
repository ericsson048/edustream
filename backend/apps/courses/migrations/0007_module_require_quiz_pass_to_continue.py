from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0006_category_table"),
    ]

    operations = [
        migrations.AddField(
            model_name="module",
            name="require_quiz_pass_to_continue",
            field=models.BooleanField(default=False),
        ),
    ]

