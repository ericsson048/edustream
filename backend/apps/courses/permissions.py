from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_admin(user):
    return bool(user and user.is_authenticated and user.role == "ADMIN")


def is_institution_admin(user):
    return bool(user and user.is_authenticated and user.role == "INSTITUTION_ADMIN")


def is_instructor_or_admin(user):
    return bool(
        user
        and user.is_authenticated
        and user.role in {"INSTRUCTOR", "ADMIN", "INSTITUTION_ADMIN"}
    )


def belongs_to_institution(user, course):
    """True when the course is owned by the caller's institution."""
    if not is_institution_admin(user) or not user.institution_id:
        return False
    return bool(course) and course.institution_id == user.institution_id


def can_manage_course(user, course):
    """Admin: everything. Instructor: own course. Institution admin: its institution's courses."""
    if is_admin(user):
        return True
    if not user or not user.is_authenticated:
        return False
    if course is not None and course.instructor_id == user.id:
        return True
    return belongs_to_institution(user, course)


def resolve_course(obj):
    """Walk module/lesson/course relations to find the related Course (or None)."""
    if obj is None:
        return None
    from .models import Course

    if isinstance(obj, Course):
        return obj
    for attr in ("course", "module", "lesson", "evaluation", "assignment", "quiz"):
        child = getattr(obj, attr, None)
        if child is not None:
            return resolve_course(child)
    return None


def owns_learning_object(user, obj):
    if is_admin(user):
        return True
    if not user or not user.is_authenticated:
        return False
    if is_institution_admin(user):
        course = resolve_course(obj)
        if course is not None:
            return belongs_to_institution(user, course)
    if hasattr(obj, "instructor"):
        return obj.instructor_id == user.id
    course = getattr(obj, "course", None)
    if course is not None:
        return owns_learning_object(user, course)
    module = getattr(obj, "module", None)
    if module is not None:
        return owns_learning_object(user, module)
    lesson = getattr(obj, "lesson", None)
    if lesson is not None:
        return owns_learning_object(user, lesson)
    quiz = getattr(obj, "quiz", None)
    if quiz is not None:
        return owns_learning_object(user, quiz)
    assignment = getattr(obj, "assignment", None)
    if assignment is not None:
        return owns_learning_object(user, assignment)
    if hasattr(obj, "created_by"):
        return obj.created_by_id == user.id
    return False


class IsInstructorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_instructor_or_admin(request.user)


class IsInstructorOwnerOrAdmin(IsInstructorOrReadOnly):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return owns_learning_object(request.user, obj)


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "student"):
            return obj.student == request.user
        if hasattr(obj, "author"):
            return obj.author == request.user
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user
        return False


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_admin(request.user)
