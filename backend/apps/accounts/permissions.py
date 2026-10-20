"""
TrustVault custom DRF permission classes.

All role enforcement happens server-side. The browser cannot grant itself
elevated permissions by modifying a request field.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allows access only to users with the ADMIN platform role.

    - Unauthenticated requests are denied (HTTP 401 / 403).
    - Authenticated non-Admin requests are denied (HTTP 403).
    - Django superusers are NOT automatically treated as Admins unless their
      role field is set to ADMIN. Separate concerns: is_superuser controls
      Django admin panel access; role controls TrustVault platform access.
    """

    message = "Admin role required."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_role
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Allows access to OWNER and ADMIN users only.
    Viewers are denied.
    """

    message = "Owner or Admin role required."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_owner_or_admin
        )
