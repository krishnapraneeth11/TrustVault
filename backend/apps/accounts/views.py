"""
TrustVault authentication and user-management views.

All role checks and temporary-password restrictions are enforced server-side.
"""

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import transaction

from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from apps.audit.models import AuditEvent
from apps.audit.services import record_audit_event
from .permissions import IsAdmin
from .serializers import (
    AdminCreateUserSerializer,
    ChangePasswordSerializer,
    ProfileUpdateSerializer,
    UserSerializer,
)


class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="Get CSRF token",
        responses={
            200: OpenApiResponse(
                description="Returns the CSRF token and sets the CSRF cookie."
            )
        },
    )
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="Log in",
        description='Submit credentials as {"username": "...", "password": "..."}.',
        request={
            "application/json": {
                "type": "object",
                "required": ["username", "password"],
                "properties": {
                    "username": {"type": "string"},
                    "password": {"type": "string", "format": "password"},
                },
            }
        },
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description="Invalid credentials or request."),
            403: OpenApiResponse(description="Account is inactive."),
        },
    )
    def post(self, request):
        body = request.data

        if not isinstance(body, dict):
            return Response(
                {"detail": "Invalid request body."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = (body.get("username") or "").strip()
        password = body.get("password") or ""

        if not isinstance(username, str) or not isinstance(password, str):
            return Response(
                {"detail": "Invalid username or password format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            # Never log the supplied password or disclose whether the username exists.
            record_audit_event(
                request=request,
                action="LOGIN",
                outcome=AuditEvent.Outcome.DENIED,
                details={"username": username, "reason": "invalid_credentials"},
            )
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        record_audit_event(
            request=request,
            action="LOGIN",
            outcome=AuditEvent.Outcome.SUCCESS,
            details={"username": user.get_username()},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutResponseSerializer

    @extend_schema(
        tags=["auth"],
        operation_id="auth_logout",
        summary="Log out",
        responses={
            200: LogoutResponseSerializer,
            403: OpenApiResponse(description="Authentication required."),
        },
    )
    def post(self, request):
        # Record the authenticated actor before logout clears the session.
        record_audit_event(
            request=request,
            action="LOGOUT",
            outcome=AuditEvent.Outcome.SUCCESS,
            details={},
        )
        logout(request)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"], summary="Get current user", responses={200: UserSerializer}
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ProfileView(APIView):
    """Read or update the current user's own profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Change the current user's password and end other sessions."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])

        # Keep the current session valid after the password change.
        from django.contrib.auth import update_session_auth_hash

        update_session_auth_hash(request, user)

        record_audit_event(
            request=request,
            action="PASSWORD_CHANGE",
            outcome=AuditEvent.Outcome.SUCCESS,
            details={"must_change_password_cleared": True},
        )
        return Response({"detail": "Password changed successfully."})


class TemporaryPasswordRestrictionMiddleware:
    """
    Note: this class is not Django middleware. The API-level restriction is
    applied by TemporaryPasswordGate below.
    """


class TemporaryPasswordGate(APIView):
    """Base class for views that require a password change first."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)

        if (
            request.user.is_authenticated
            and request.user.must_change_password
            and request.path.rstrip("/") != "/api/auth/change-password"
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "You must change your temporary password before continuing."
            )


class AdminUserListCreateView(TemporaryPasswordGate):
    """Admin-only employee listing and account creation."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by("username")
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Never include the temporary password in audit details.
        record_audit_event(
            request=request,
            action="USER_CREATE",
            outcome=AuditEvent.Outcome.SUCCESS,
            details={
                "created_user_id": user.pk,
                "username": user.get_username(),
                "role": user.role,
            },
        )
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class AdminUserStatusView(TemporaryPasswordGate):
    """Admin-only account activation/deactivation."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, user_id):
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target.pk == request.user.pk:
            return Response(
                {
                    "detail": "You cannot deactivate or reactivate your own account here."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_active = request.data.get("is_active")

        if not isinstance(is_active, bool):
            return Response(
                {"detail": "is_active must be true or false."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_is_active = target.is_active
        target.is_active = is_active
        target.save(update_fields=["is_active"])

        record_audit_event(
            request=request,
            action="USER_STATUS_CHANGE",
            outcome=AuditEvent.Outcome.SUCCESS,
            details={
                "target_user_id": target.pk,
                "username": target.get_username(),
                "previous_is_active": previous_is_active,
                "is_active": is_active,
            },
        )
        return Response(UserSerializer(target).data)


class AdminUserDeleteView(TemporaryPasswordGate):
    """Admin-only permanent deletion of an employee account."""

    permission_classes = [IsAuthenticated, IsAdmin]

    @transaction.atomic
    def delete(self, request, user_id):
        try:
            target = User.objects.select_for_update().get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target.pk == request.user.pk:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_superuser:
            return Response(
                {
                    "detail": "Superuser accounts cannot be deleted through this endpoint."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.owned_documents.exists():
            return Response(
                {
                    "detail": (
                        "This account owns documents. Transfer ownership "
                        "before deleting the account."
                    ),
                    "code": "user_owns_documents",
                },
                status=status.HTTP_409_CONFLICT,
            )

        username = target.username
        deleted_user_id = target.pk
        target.delete()

        record_audit_event(
            request=request,
            action="USER_DELETE",
            outcome=AuditEvent.Outcome.SUCCESS,
            details={
                "deleted_user_id": deleted_user_id,
                "username": username,
            },
        )
        return Response(
            {
                "detail": f"Account '{username}' was permanently deleted.",
                "deleted_user_id": user_id,
            },
            status=status.HTTP_200_OK,
        )


class AdminProbeView(TemporaryPasswordGate):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(
        tags=["auth"],
        summary="Verify administrator access",
        responses={
            200: OpenApiResponse(description="Administrator access confirmed."),
            403: OpenApiResponse(description="Administrator access denied."),
        },
    )
    def get(self, request):
        return Response(
            {
                "detail": "Admin access confirmed.",
                "user": request.user.username,
            }
        )
