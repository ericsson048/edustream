import json

from rest_framework import serializers

from .models import Category, Certificate, Course, Enrollment, Lesson, Module, Note, Progress, Resource


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
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


class LessonSerializer(serializers.ModelSerializer):
    resources = ResourceSerializer(many=True, read_only=True)
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


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = "__all__"


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source="instructor.full_name", read_only=True)
    modules = ModuleSerializer(many=True, read_only=True)
    thumbnail = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.filter(is_active=True), allow_null=True, required=False)
    category_slug = serializers.SerializerMethodField()
    enrollments_count = serializers.IntegerField(source="enrollments.count", read_only=True)

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["slug", "instructor", "platform_fee_percentage", "created_at", "updated_at", "modules", "thumbnail", "category", "category_slug"]

    def to_internal_value(self, data):
        mutable = data.copy()
        for field in ["learning_objectives", "prerequisites", "target_audience"]:
            value = mutable.get(field)
            if isinstance(value, str):
                try:
                    mutable[field] = json.loads(value)
                except json.JSONDecodeError:
                    pass
        return super().to_internal_value(mutable)

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


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Enrollment
        fields = "__all__"
        read_only_fields = ["student"]


class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Progress
        fields = "__all__"


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = "__all__"
        read_only_fields = ["user"]


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = "__all__"
