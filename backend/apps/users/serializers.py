from django.contrib.auth import get_user_model
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
            "stripe_account_id",
            "stripe_customer_id",
            "date_joined",
        ]
        read_only_fields = ["id", "stripe_account_id", "stripe_customer_id", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "full_name", "role", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
