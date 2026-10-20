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

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        token = get_token(request)
        return Response({"csrfToken": token})


class LoginView(APIView):
    """
    POST /api/auth/login/

    Body: {"username": "...", "password": "..."}

    Success (200): returns the authenticated user object.
    Failure (400): returns a generic error — does not reveal whether the
                   username exists or the password was incorrect.

    Authentication not required (the user is logging in), but CSRF IS enforced.
    DRF's SessionAuthentication enforces CSRF; we keep it in authentication_classes
    so the middleware-level check runs, but set permission_classes to AllowAny so
    unauthenticated users can reach the view.
    """

    # Keep SessionAuthentication so DRF enforces CSRF on this endpoint.
    # AllowAny means unauthenticated requests can proceed — login is public.
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, AttributeError):
            return Response(
                {"detail": "Invalid request body."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = (body.get("username") or "").strip()
        password = body.get("password") or ""

        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            # Generic message — do not reveal whether the username exists.
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
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Invalidates the current session completely (flush, not just clear).
    Requires authentication — unauthenticated logout attempts return 403.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)  # calls request.session.flush() internally
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    GET /api/auth/me/

    Returns the current authenticated user's data.
    Unauthenticated requests receive 403.
    """

    permission_classes = [IsAuthenticated]

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

    def get(self, request):
        return Response(
            {
                "detail": "Admin access confirmed.",
                "user": request.user.username,
            }
        )
