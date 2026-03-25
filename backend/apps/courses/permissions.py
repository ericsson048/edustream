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
    if hasattr(obj, "course"):
        return owns_learning_object(user, obj.course)
    if hasattr(obj, "module"):
        return owns_learning_object(user, obj.module)
    if hasattr(obj, "lesson"):
        return owns_learning_object(user, obj.lesson)
    if hasattr(obj, "quiz"):
        return owns_learning_object(user, obj.quiz)
    if hasattr(obj, "assignment"):
        return owns_learning_object(user, obj.assignment)
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
