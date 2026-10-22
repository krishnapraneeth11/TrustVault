"""
TrustVault authentication views.

Endpoints
---------
GET  /api/auth/csrf/    — Set the CSRF cookie; return the token. SPA must call
                          this before any state-changing request.
POST /api/auth/login/   — Session login. Returns user data on success.
POST /api/auth/logout/  — Session invalidation.
GET  /api/auth/me/      — Current authenticated user data.
GET  /api/auth/admin/   — Admin-only probe endpoint (for testing role guards).

Security notes
--------------
- Login uses Django's authenticate() — passwords are never stored or logged.
- Login failure returns a generic 400 message (does not leak whether the
  username or email exists).
- Logout uses flush() to destroy the session completely, not just clear it.
- All state-changing endpoints enforce CSRF via Django's CsrfViewMiddleware.
- The SPA must send cookies with credentials: "include" for session auth.
- Role is read from the database; it cannot be provided by the client.
"""

import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views import View
from django.views.decorators.http import require_GET
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import serializers

from .models import User
from .permissions import IsAdmin
from .serializers import UserSerializer


class CsrfTokenView(APIView):
    """
    GET /api/auth/csrf/

    Sets the CSRF cookie and returns the token in the response body.
    The SPA must call this endpoint once before making any POST/PUT/DELETE
    requests. The token should be sent as the X-CSRFToken request header.

    Authentication not required (AllowAny).
    """

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
        token = get_token(request)
        return Response({"csrfToken": token})


class LoginView(APIView):
    """
    POST /api/auth/login/

    Body: {"username": "...", "password": "..."}

    Success (200): returns the authenticated user object.
    Failure (400): returns a generic invalid-credentials error.
    """

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
        # DRF parses the request body safely.
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

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        if user is None:
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

        serializer = UserSerializer(user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class LogoutResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Invalidates the current session completely.
    Requires authentication.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutResponseSerializer

    @extend_schema(
        tags=["auth"],
        operation_id="auth_logout",
        summary="Log out",
        description="Invalidates the authenticated user's session.",
        responses={
            200: LogoutResponseSerializer,
            403: OpenApiResponse(
                description="Authentication required.",
            ),
        },
    )
    def post(self, request):
        logout(request)

        return Response(
            {"detail": "Logged out."},
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    GET /api/auth/me/

    Returns the current authenticated user's data.
    Unauthenticated requests receive 403.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Get current user",
        responses={200: UserSerializer},
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class AdminProbeView(APIView):
    """
    GET /api/auth/admin/

    Admin-only endpoint used to verify role-based access control.
    Returns 403 for non-Admin authenticated users and 403 for unauthenticated
    requests (DRF returns 403 when IsAuthenticated is the base class and the
    user fails; IsAdmin adds the role check on top).
    """

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
