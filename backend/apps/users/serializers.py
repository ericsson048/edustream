from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Institution

User = get_user_model()

DEFAULT_PASSWORD = "password123"


class InstitutionSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Institution
        fields = [
            "id", "name", "slug", "description", "logo_url",
            "country", "website", "is_active", "created_at", "members_count",
        ]
        read_only_fields = ["id", "slug", "created_at", "members_count"]

    def get_members_count(self, obj):
        return obj.members.filter(is_active=True).count()


class UserSerializer(serializers.ModelSerializer):
    institution_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "role", "is_active",
            "email_verified", "must_change_password",
            "stripe_account_id", "stripe_customer_id",
            "avatar_url", "bio", "location", "website", "title",
            "date_joined", "last_seen", "preferences",
            "institution", "institution_name", "created_by",
        ]
        read_only_fields = [
            "id", "stripe_account_id", "stripe_customer_id",
            "date_joined", "last_seen", "institution_name",
        ]

    def get_institution_name(self, obj):
        return obj.institution.name if obj.institution else None


class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "full_name", "role", "avatar_url",
            "bio", "location", "website", "title", "date_joined",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ["email", "full_name", "role", "password"]
        extra_kwargs = {"role": {"required": False}}

    def validate_role(self, value):
        if value not in {User.Role.STUDENT, User.Role.INSTRUCTOR}:
            raise serializers.ValidationError("Role must be STUDENT or INSTRUCTOR.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        user.email_verified = False
        user.save(update_fields=["email_verified"])
        return user


class CreateManagedUserSerializer(serializers.Serializer):
    """Used by instructors and institution admins to create users with default password."""
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=["STUDENT", "INSTRUCTOR"])
    institution = serializers.UUIDField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def create(self, validated_data):
        institution_id = validated_data.pop("institution", None)
        creator = self.context["request"].user

        # Instructors can only create students
        if creator.role == User.Role.INSTRUCTOR:
            validated_data["role"] = "STUDENT"

        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            role=validated_data["role"],
            password=DEFAULT_PASSWORD,
        )
        user.must_change_password = True
        user.email_verified = True
        user.created_by = creator
        if institution_id:
            try:
                user.institution_id = institution_id
            except Exception:
                pass
        elif creator.institution:
            user.institution = creator.institution
        user.save(update_fields=["must_change_password", "email_verified", "created_by", "institution"])
        return user
