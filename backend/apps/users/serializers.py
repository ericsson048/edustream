from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "email_verified",
            "stripe_account_id",
            "stripe_customer_id",
            "avatar_url",
            "bio",
            "location",
            "website",
            "title",
            "date_joined",
            "last_seen",
            "preferences",
        ]
        read_only_fields = ["id", "stripe_account_id", "stripe_customer_id", "date_joined", "last_seen"]


class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "role",
            "avatar_url",
            "bio",
            "location",
            "website",
            "title",
            "date_joined",
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
