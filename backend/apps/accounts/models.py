"""
TrustVault custom User model.

Extends Django's AbstractUser to add a role field.
Role assignment is admin-only; it is never writable through normal user-facing APIs.

Roles
-----
ADMIN   — Full platform access, user management, audit log access.
OWNER   — Can upload documents and manage their own document access grants.
VIEWER  — Read-only access to documents explicitly shared with them.

Security notes
--------------
- Passwords are hashed by Django's PBKDF2-SHA256 (default) before storage.
- The role field has a database-level constraint (choices) enforced by Django.
- Role changes require admin access or a direct superuser action.
- Users cannot modify their own role through any API endpoint in this project.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user model with TrustVault role support."""

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        OWNER = "OWNER", "Owner"
        VIEWER = "VIEWER", "Viewer"

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.VIEWER,
        db_index=True,
        help_text=(
            "Platform role. Only admins or superusers may change this. "
            "ADMIN: full access. OWNER: can upload and share. VIEWER: read-only."
        ),
    )
    must_change_password = models.BooleanField(
        default=False,
        help_text="Require the user to change their temporary password.",
    )

    # Use email as the unique identifier for display; username is still used
    # by Django's authentication backend (kept for simplicity).
    email = models.EmailField(unique=True)

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["username"]

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"

    @property
    def is_admin_role(self) -> bool:
        """True if this user holds the ADMIN platform role."""
        return self.role == self.Role.ADMIN

    @property
    def is_owner_or_admin(self) -> bool:
        """True if this user can upload or share documents."""
        return self.role in (self.Role.ADMIN, self.Role.OWNER)
