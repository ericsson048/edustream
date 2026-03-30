from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_admin(user):
    return bool(user and user.is_authenticated and user.role == "ADMIN")


def is_instructor_or_admin(user):
    return bool(user and user.is_authenticated and user.role in {"INSTRUCTOR", "ADMIN"})


def owns_learning_object(user, obj):
    if is_admin(user):
        return True
    if not user or not user.is_authenticated:
        return False
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
        return False
