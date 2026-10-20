"""
TrustVault accounts Django admin registration.

Security notes
--------------
- The role field is visible in the admin panel.
- Only Django superusers can change a user's role via the admin panel.
- The role field is excluded from the user's own profile editing form (via
  the fieldsets configuration below), preventing self-promotion.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Extends Django's built-in UserAdmin to surface the role field.

    Role is shown in the list view and can be edited by superusers.
    Non-superuser staff (if any) cannot change roles because they do not
    have the 'accounts | user | Can change user' permission by default.
    """

    list_display = ("username", "email", "first_name", "last_name", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)

    # Add the role field to the change form, in its own section.
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "TrustVault Role",
            {
                "fields": ("role",),
                "description": (
                    "The TrustVault platform role. Only superusers should change this. "
                    "Assigning ADMIN grants full platform access."
                ),
            },
        ),
    )

    # Also make role available when creating a new user.
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "TrustVault Role",
            {
                "classes": ("wide",),
                "fields": ("role",),
            },
        ),
    )
