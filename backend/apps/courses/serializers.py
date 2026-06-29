import json

from rest_framework import serializers

from .models import (
    Category,
    Certificate,
    ContentBlock,
    Course,
    CourseReview,
    CourseVersion,
    Enrollment,
    LearningPath,
    Lesson,
    LessonComment,
    Module,
    Note,
    PathCourse,
    Progress,
    Resource,
    Section,
    Tag,
)


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = "__all__"
        read_only_fields = ["slug"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ContentBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentBlock
        fields = "__all__"


class ResourceSerializer(serializers.ModelSerializer):
    file_download_url = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = "__all__"

    def get_file_download_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return obj.file_url


class LessonCommentSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_avatar = serializers.CharField(source="user.avatar_url", read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = LessonComment
        fields = "__all__"
        read_only_fields = ["user"]

    def get_replies(self, obj):
        return LessonCommentSerializer(obj.replies.all(), many=True).data


class LessonSerializer(serializers.ModelSerializer):
    resources = ResourceSerializer(many=True, read_only=True)
    content_blocks = ContentBlockSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = "__all__"

    def get_video(self, obj):
        request = self.context.get("request")
        if obj.video_file:
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return obj.video_url

    def get_comments(self, obj):
        return LessonCommentSerializer(obj.comments.filter(parent__isnull=True), many=True).data


class SectionSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = "__all__"

    def get_modules(self, obj):
        request = self.context.get("request")
        modules = obj.modules.all()
        if request and request.user.is_authenticated and request.user.role not in {"ADMIN", "INSTRUCTOR"}:
            modules = modules.filter(is_published=True)
        return ModuleSerializer(modules, many=True, context=self.context).data


class ModuleSerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = "__all__"

    def get_lessons(self, obj):
        request = self.context.get("request")
        lessons = obj.lessons.all()
        if request and request.user.is_authenticated and request.user.role not in {"ADMIN", "INSTRUCTOR"}:
            lessons = lessons.filter(status=Lesson.Status.PUBLISHED)
        return LessonSerializer(lessons, many=True, context=self.context).data


class CourseReviewSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_avatar = serializers.CharField(source="user.avatar_url", read_only=True)

    class Meta:
        model = CourseReview
        fields = "__all__"
        read_only_fields = ["user"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source="instructor.full_name", read_only=True)
    modules = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    learning_objectives = serializers.ListField(child=serializers.CharField(), required=False)
    prerequisites = serializers.ListField(child=serializers.CharField(), required=False)
    target_audience = serializers.ListField(child=serializers.CharField(), required=False)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.filter(is_active=True), allow_null=True, required=False)
    category_slug = serializers.SerializerMethodField()
    enrollments_count = serializers.IntegerField(source="enrollments.count", read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        source="tags", queryset=Tag.objects.all(), many=True, required=False, write_only=True
    )
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["slug", "instructor", "platform_fee_percentage", "created_at", "updated_at", "modules", "thumbnail", "category", "category_slug", "sections"]

    def _normalize_string_list_field(self, data, field):
        if hasattr(data, "getlist"):
            raw_values = data.getlist(field)
        else:
            value = data.get(field)
            raw_values = value if isinstance(value, (list, tuple)) else [value]

        raw_values = [value for value in raw_values if value is not None]
        if not raw_values:
            return None

        if len(raw_values) == 1:
            single_value = raw_values[0]
            if isinstance(single_value, str):
                try:
                    parsed = json.loads(single_value)
                except json.JSONDecodeError:
                    parsed = [single_value]
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
                return [str(parsed).strip()] if str(parsed).strip() else []
            if isinstance(single_value, (list, tuple)):
                return [str(item).strip() for item in single_value if str(item).strip()]

        return [str(item).strip() for item in raw_values if str(item).strip()]

    def to_internal_value(self, data):
        if hasattr(data, "items"):
            mutable = {key: value for key, value in data.items()}
        else:
            mutable = dict(data)
        for field in ["learning_objectives", "prerequisites", "target_audience"]:
            normalized = self._normalize_string_list_field(data, field)
            if normalized is not None:
                mutable[field] = normalized
        return super().to_internal_value(mutable)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        should_publish = attrs.get("is_published")
        if should_publish is None and self.instance is not None:
            should_publish = self.instance.is_published

        if not should_publish:
            return attrs

        modules = getattr(self.instance, "modules", None)
        if modules is None:
            raise serializers.ValidationError(
                {"is_published": "A course can only be published after adding at least one module with a published lesson."}
            )

        has_published_content = modules.filter(is_published=True, lessons__status=Lesson.Status.PUBLISHED).exists()
        if not has_published_content:
            raise serializers.ValidationError(
                {"is_published": "A course can only be published after adding at least one published module containing one published lesson."}
            )

        return attrs

    def get_thumbnail(self, obj):
        request = self.context.get("request")
        if obj.thumbnail_file:
            if request:
                return request.build_absolute_uri(obj.thumbnail_file.url)
            return obj.thumbnail_file.url
        return obj.thumbnail_url

    def get_category(self, obj):
        return obj.category.name if obj.category else ""

    def get_category_slug(self, obj):
        return obj.category.slug if obj.category else ""

    def get_modules(self, obj):
        request = self.context.get("request")
        modules = obj.modules.filter(section__isnull=True)
        if request and request.user.is_authenticated and request.user.role not in {"ADMIN", "INSTRUCTOR"}:
            modules = modules.filter(is_published=True)
        return ModuleSerializer(modules, many=True, context=self.context).data

    def get_sections(self, obj):
        request = self.context.get("request")
        sections = obj.sections.all()
        return SectionSerializer(sections, many=True, context=self.context).data

    def get_reviews(self, obj):
        return CourseReviewSerializer(obj.reviews.select_related("user").all()[:10], many=True).data

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        total = sum(r.rating for r in reviews)
        return round(total / reviews.count(), 1)


class LearningPathSerializer(serializers.ModelSerializer):
    courses = serializers.SerializerMethodField()

    class Meta:
        model = LearningPath
        fields = "__all__"

    def get_courses(self, obj):
        return PathCourseSerializer(obj.path_courses.select_related("course").all(), many=True).data


class PathCourseSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    course_thumbnail = serializers.CharField(source="course.thumbnail_url", read_only=True)
    course_level = serializers.CharField(source="course.level", read_only=True)

    class Meta:
        model = PathCourse
        fields = "__all__"


class CourseVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseVersion
        fields = "__all__"


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Enrollment
        fields = "__all__"
        read_only_fields = ["student"]


class ProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    lesson_order = serializers.IntegerField(source="lesson.order", read_only=True)
    module_id = serializers.UUIDField(source="lesson.module_id", read_only=True)
    module_title = serializers.CharField(source="lesson.module.title", read_only=True)
    course_id = serializers.UUIDField(source="enrollment.course_id", read_only=True)

    class Meta:
        model = Progress
        fields = "__all__"


class NoteSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)

    class Meta:
        model = Note
        fields = "__all__"
        read_only_fields = ["user"]


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    instructor_name = serializers.CharField(source="course.instructor.full_name", read_only=True)

    class Meta:
        model = Certificate
        fields = "__all__"
