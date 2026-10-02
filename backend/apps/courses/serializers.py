import json

from rest_framework import serializers

from .models import (
    AttendanceRecord,
    Category,
    Certificate,
    ContentBlock,
    Course,
    CourseGrade,
    CourseInvitation,
    CourseReview,
    CourseVersion,
    Enrollment,
    Evaluation,
    EvaluationGrade,
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
    UniversitySession,
)
from .university import can_justify


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
    is_locked = serializers.SerializerMethodField()
    locked_reason = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = "__all__"

    def get_is_locked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        from apps.courses.models import is_lesson_accessible
        accessible, _ = is_lesson_accessible(request.user.id, obj)
        return not accessible

    def get_locked_reason(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return ""
        from apps.courses.models import is_lesson_accessible
        accessible, reason = is_lesson_accessible(request.user.id, obj)
        return reason if not accessible else ""

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
        course_type = attrs.get("course_type")
        if course_type is None and self.instance is not None:
            course_type = self.instance.course_type
        start_date = attrs.get("start_date")
        if start_date is None and self.instance is not None:
            start_date = self.instance.start_date
        end_date = attrs.get("end_date")
        if end_date is None and self.instance is not None:
            end_date = self.instance.end_date

        if course_type == Course.CourseType.MARGINAL:
            if not start_date or not end_date:
                raise serializers.ValidationError(
                    {"start_date": "Un cours marginal doit définir une période (start_date et end_date)."}
                )
            if end_date < start_date:
                raise serializers.ValidationError(
                    {"end_date": "La date de fin doit être postérieure à la date de début."}
                )

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


class CourseInvitationSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = CourseInvitation
        fields = [
            "id",
            "course",
            "course_title",
            "code",
            "max_uses",
            "used_count",
            "expires_at",
            "is_active",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "course", "course_title", "code", "used_count", "is_active", "created_by", "created_at"]


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    invitation_code = serializers.CharField(source="invitation.code", read_only=True)
    invitation = serializers.PrimaryKeyRelatedField(read_only=True)

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


class UniversitySessionSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = UniversitySession
        fields = "__all__"
        read_only_fields = ["created_by"]

    def get_student_count(self, obj):
        return obj.course.enrollments.filter(is_active=True).count()


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    course_id = serializers.UUIDField(source="session.course_id", read_only=True)
    course_title = serializers.CharField(source="session.course.title", read_only=True)
    session_title = serializers.CharField(source="session.title", read_only=True)
    session_date = serializers.DateField(source="session.date", read_only=True)
    session_type = serializers.CharField(source="session.session_type", read_only=True)
    session_end = serializers.SerializerMethodField()
    can_justify = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = [
            "session",
            "student",
            "status",
            "justification",
            "justification_status",
            "justification_submitted_at",
            "reviewed_by",
            "reviewed_at",
        ]

    def get_session_end(self, obj):
        return obj.session_end.isoformat()

    def get_can_justify(self, obj):
        return can_justify(obj)


class EvaluationSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    source = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = "__all__"
        read_only_fields = ["created_by"]

    def get_source(self, obj):
        if obj.quiz_id:
            return f"Quiz : {obj.quiz.title}"
        if obj.assignment_id:
            return f"Devoir : {obj.assignment.title}"
        return None


class EvaluationGradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="enrollment.student.full_name", read_only=True)
    evaluation_title = serializers.CharField(source="evaluation.title", read_only=True)
    evaluation_kind = serializers.CharField(source="evaluation.kind", read_only=True)
    course_id = serializers.UUIDField(source="evaluation.course_id", read_only=True)

    class Meta:
        model = EvaluationGrade
        fields = "__all__"

    def validate_note(self, value):
        if value is not None and (value < 0 or value > 20):
            raise serializers.ValidationError("La note doit être comprise entre 0 et 20.")
        return value


class CourseGradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="enrollment.student.full_name", read_only=True)
    course_id = serializers.UUIDField(source="enrollment.course_id", read_only=True)
    decision_display = serializers.CharField(source="get_decision_display", read_only=True)

    class Meta:
        model = CourseGrade
        fields = "__all__"
        read_only_fields = ["decided_by"]
