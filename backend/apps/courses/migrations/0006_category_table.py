import django.db.models.deletion
import django.utils.text
import uuid
from django.db import migrations, models


def migrate_course_categories(apps, schema_editor):
    Course = apps.get_model("courses", "Course")
    Category = apps.get_model("courses", "Category")

    category_cache = {}
    for course in Course.objects.all():
        raw_name = (getattr(course, "category_legacy", "") or "").strip()
        if not raw_name:
            continue
        slug = django.utils.text.slugify(raw_name)
        category = category_cache.get(slug)
        if category is None:
            category, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": raw_name,
                    "description": "",
                    "is_active": True,
                },
            )
            category_cache[slug] = category
        course.category_ref_id = category.id
        course.save(update_fields=["category_ref"])


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0005_course_estimated_hours_course_language_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120, unique=True)),
                ("slug", models.SlugField(blank=True, max_length=140, unique=True)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name_plural": "categories",
                "ordering": ["order", "name"],
            },
        ),
        migrations.RenameField(
            model_name="course",
            old_name="category",
            new_name="category_legacy",
        ),
        migrations.AddField(
            model_name="course",
            name="category_ref",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="courses", to="courses.category"),
        ),
        migrations.RunPython(migrate_course_categories, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="course",
            name="category_legacy",
        ),
        migrations.RenameField(
            model_name="course",
            old_name="category_ref",
            new_name="category",
        ),
    ]
