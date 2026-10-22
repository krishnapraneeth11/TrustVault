"""
TrustVault account serializers.

Security:
- Never expose passwords or internal Django permission flags.
- Users cannot change their own username, role, or account status.
- Admin-created accounts receive a temporary password and must change it.
"""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Safe representation of user information."""

    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "date_joined",
            "must_change_password",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "username",
            "role",
            "role_display",
            "date_joined",
            "must_change_password",
            "is_active",
        ]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Allow a user to update their own profile without changing their role."""

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name"]

    def validate_email(self, value):
        value = value.strip().lower()

        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Validate a password change for the currently authenticated user."""

    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        user = self.context["request"].user

        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": "Current password is incorrect."}
            )

        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "Choose a different password."}
            )

        validate_password(attrs["new_password"], user=user)
        return attrs


class AdminCreateUserSerializer(serializers.ModelSerializer):
    """Create a new employee account with a temporary password."""

    temporary_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    role = serializers.ChoiceField(
        choices=[
            (User.Role.OWNER, "Owner"),
            (User.Role.VIEWER, "Viewer"),
        ],
        default=User.Role.VIEWER,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "temporary_password",
        ]
        read_only_fields = ["id"]

    def validate_username(self, value):
        value = value.strip()

        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate_temporary_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("temporary_password")

        user = User(
            **validated_data,
            is_active=True,
            must_change_password=True,
        )

        user.set_password(password)
        user.save()

        return user
