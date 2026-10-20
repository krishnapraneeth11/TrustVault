"""
TrustVault accounts serializers.

Safe output rules:
- Never expose password, password_hash, or any hashed credential field.
- Never expose is_superuser, is_staff, or internal Django permission flags.
- UserSerializer is read-only for the role field from the user's perspective.
"""

from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Read-safe representation of a User.

    Exposed fields are safe for the authenticated user to see about themselves.
    The role field is read-only — it cannot be changed via this serializer.
    """

    role_display = serializers.CharField(source="get_role_display", read_only=True)

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
        ]
        read_only_fields = [
            "id",
            "username",
            "role",
            "role_display",
            "date_joined",
        ]
        # Explicitly excluded (never serialised):
        # password, password_hash, is_superuser, is_staff, user_permissions, groups
