from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsInstructorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in {"INSTRUCTOR", "ADMIN"}


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "student"):
            return obj.student == request.user
        return False
