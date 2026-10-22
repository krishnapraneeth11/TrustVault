"""
TrustVault authentication and role tests.

Tests
-----
1.  Successful login.
2.  Failed login — wrong password (generic error, no username disclosure).
3.  Failed login — username does not exist (same generic error).
4.  GET /api/auth/me/ while unauthenticated → 403.
5.  GET /api/auth/me/ while authenticated → 200 with user data.
6.  POST /api/auth/logout/ → 200, session destroyed.
7.  GET /api/auth/me/ after logout → 403.
8.  GET /api/auth/admin/ denied for unauthenticated → 403.
9.  GET /api/auth/admin/ denied for OWNER → 403.
10. GET /api/auth/admin/ denied for VIEWER → 403.
11. GET /api/auth/admin/ allowed for ADMIN → 200.
12. A normal user cannot promote themselves via POST /api/auth/login/.
13. Password hash is not exposed in /api/auth/me/ response.
14. CSRF: POST login without CSRF token is rejected (403) from non-exempt client.

Notes
-----
- Django test client handles CSRF via enforce_csrf_checks=True / False.
- Session authentication is used throughout.
- No real network calls are made; all tests use the Django in-memory test runner.
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from apps.audit.models import AuditEvent

User = get_user_model()


# ── Helpers ────────────────────────────────────────────────────────────────────


def make_user(username, password, role=User.Role.VIEWER, email=None):
    """Create and return an active user with the given role."""
    if email is None:
        email = f"{username}@trustvault.test"
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        role=role,
    )
    return user


def login(client, username, password):
    """POST to the login endpoint and return the response."""
    import json

    return client.post(
        "/api/auth/login/",
        data=json.dumps({"username": username, "password": password}),
        content_type="application/json",
    )


# ── Test Cases ─────────────────────────────────────────────────────────────────


class AuthTests(TestCase):
    """Core authentication tests."""

    def setUp(self):
        self.client = Client()  # CSRF checks NOT enforced by default
        self.password = "SecurePass!99"
        self.viewer = make_user("viewer", self.password, User.Role.VIEWER)
        self.owner = make_user("owner", self.password, User.Role.OWNER)
        self.admin = make_user("admin_user", self.password, User.Role.ADMIN)

    # ── Test 1: Successful login ──────────────────────────────────────────────

    def test_01_successful_login(self):
        """Correct credentials → 200 with user data."""
        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], "viewer")
        self.assertEqual(data["role"], "VIEWER")

    # ── Test 2: Wrong password ────────────────────────────────────────────────

    def test_02_wrong_password(self):
        """Wrong password → 400 with generic error, not 'wrong password'."""
        response = login(self.client, "viewer", "wrong-password")
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)
        # Must not reveal that the username exists
        self.assertNotIn("password", data["detail"].lower())
        self.assertNotIn("username", data["detail"].lower())

    # ── Test 3: Nonexistent username ──────────────────────────────────────────

    def test_03_nonexistent_username(self):
        """Unknown username → same 400 generic error as wrong password."""
        response = login(self.client, "ghost", self.password)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)
        # Same message as test_02 — prevents username enumeration
        self.assertEqual(data["detail"], "Invalid credentials.")

    # ── Test 4: /me/ while unauthenticated ───────────────────────────────────

    def test_04_me_unauthenticated(self):
        """/api/auth/me/ without a session → 403."""
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 403)

    # ── Test 5: /me/ while authenticated ─────────────────────────────────────

    def test_05_me_authenticated(self):
        """/api/auth/me/ with a valid session → 200 with correct user."""
        login(self.client, "viewer", self.password)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], "viewer")
        self.assertEqual(data["role"], "VIEWER")

    # ── Test 6: Logout ────────────────────────────────────────────────────────

    def test_06_logout(self):
        """POST /api/auth/logout/ → 200."""
        login(self.client, "viewer", self.password)
        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["detail"], "Logged out.")

    # ── Test 7: /me/ after logout ─────────────────────────────────────────────

    def test_07_me_after_logout(self):
        """Session is destroyed on logout; /me/ returns 403 afterwards."""
        login(self.client, "viewer", self.password)
        self.client.post("/api/auth/logout/")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 403)

    # ── Test 8: Admin probe — unauthenticated ─────────────────────────────────

    def test_08_admin_probe_unauthenticated(self):
        """Admin-only endpoint denies unauthenticated users."""
        response = self.client.get("/api/auth/admin/")
        self.assertEqual(response.status_code, 403)

    # ── Test 9: Admin probe — OWNER ───────────────────────────────────────────

    def test_09_admin_probe_owner_denied(self):
        """Admin-only endpoint denies OWNER."""
        login(self.client, "owner", self.password)
        response = self.client.get("/api/auth/admin/")
        self.assertEqual(response.status_code, 403)

    # ── Test 10: Admin probe — VIEWER ─────────────────────────────────────────

    def test_10_admin_probe_viewer_denied(self):
        """Admin-only endpoint denies VIEWER."""
        login(self.client, "viewer", self.password)
        response = self.client.get("/api/auth/admin/")
        self.assertEqual(response.status_code, 403)

    # ── Test 11: Admin probe — ADMIN ──────────────────────────────────────────

    def test_11_admin_probe_admin_allowed(self):
        """Admin-only endpoint allows ADMIN."""
        login(self.client, "admin_user", self.password)
        response = self.client.get("/api/auth/admin/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Admin access confirmed", response.json()["detail"])

    # ── Test 12: Self-promotion via login ─────────────────────────────────────

    def test_12_cannot_self_promote_via_login(self):
        """
        A user cannot promote themselves by sending a role in the login body.
        The role in the response must match the database value, not the request.
        """
        import json

        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps(
                {
                    "username": "viewer",
                    "password": self.password,
                    "role": "ADMIN",  # Attacker-supplied role — must be ignored
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        # Role must still be VIEWER from the database
        self.assertEqual(response.json()["role"], "VIEWER")
        # Confirm the DB was not changed
        self.viewer.refresh_from_db()
        self.assertEqual(self.viewer.role, User.Role.VIEWER)

    # ── Test 13: Password hash not in /me/ response ───────────────────────────

    def test_13_password_not_in_me_response(self):
        """The /me/ response must not contain any password-related field."""
        login(self.client, "viewer", self.password)
        response = self.client.get("/api/auth/me/")
        data = response.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)
        # Also check the serialised string doesn't contain the hash prefix
        raw = response.content.decode()
        self.assertNotIn("pbkdf2_sha256", raw)
        self.assertNotIn("bcrypt", raw)

    # ── Test 14: CSRF enforcement on authenticated endpoints ──────────────────

    def test_14_csrf_enforced_on_authenticated_endpoints(self):
        """
        CSRF is enforced by DRF's SessionAuthentication on authenticated endpoints.

        How it works:
        - DRF marks all APIViews as csrf_exempt at the Django middleware level.
        - DRF's SessionAuthentication class re-adds CSRF enforcement when a
          session cookie is present.
        - The login endpoint (authentication_classes=[]) is intentionally not
          CSRF-protected — this is standard practice for session-based login flows
          because the CSRF cookie cannot exist before the first request.
        - POST to logout (IsAuthenticated + SessionAuthentication) WITH a session
          but WITHOUT the CSRF token must be rejected.

        This test verifies the SessionAuthentication CSRF enforcement on logout.
        """
        import json

        csrf_client = Client(enforce_csrf_checks=True)

        # Step 1: Log in (no CSRF needed for the login endpoint itself)
        login_response = csrf_client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "viewer", "password": self.password}),
            content_type="application/json",
        )
        self.assertEqual(login_response.status_code, 200, "Login should succeed")

        # Step 2: POST to logout WITHOUT X-CSRFToken — must be rejected
        # (SessionAuthentication enforces CSRF on session-authenticated requests)
        logout_no_csrf = csrf_client.post("/api/auth/logout/")
        self.assertEqual(
            logout_no_csrf.status_code,
            403,
            "Logout without CSRF token should be rejected by SessionAuthentication.",
        )

        # Step 3: Fetch the CSRF token and retry logout — must succeed
        csrf_token = csrf_client.get("/api/auth/csrf/").json()["csrfToken"]
        logout_with_csrf = csrf_client.post(
            "/api/auth/logout/",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(
            logout_with_csrf.status_code,
            200,
            "Logout WITH correct CSRF token should succeed.",
        )

    # ── New tests: Temporary passwords and account management ─────────────

    def test_15_temporary_password_user_cannot_access_documents(self):
        """A temporary-password user must change their password first."""
        self.viewer.must_change_password = True
        self.viewer.save(update_fields=["must_change_password"])

        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/documents/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["code"],
            "password_change_required",
        )

    def test_16_temporary_password_user_can_change_password(self):
        """The password-change endpoint remains accessible."""
        self.viewer.must_change_password = True
        self.viewer.save(update_fields=["must_change_password"])

        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/change-password/",
            data={
                "current_password": self.password,
                "new_password": "A-new-strong-password-83!",
            },
        )

        self.assertEqual(response.status_code, 200)

        self.viewer.refresh_from_db()
        self.assertFalse(self.viewer.must_change_password)
        self.assertTrue(self.viewer.check_password("A-new-strong-password-83!"))

    def test_17_document_access_restored_after_password_change(self):
        """After changing the password, normal API authorization resumes."""
        self.viewer.must_change_password = True
        self.viewer.save(update_fields=["must_change_password"])

        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/change-password/",
            data={
                "current_password": self.password,
                "new_password": "A-new-strong-password-83!",
            },
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/documents/")

        # A normal Viewer may list only documents they are authorized to see.
        self.assertEqual(response.status_code, 200)

    def test_18_viewer_cannot_create_employee_accounts(self):
        """A Viewer must not be able to create another user."""
        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/users/",
            data={
                "username": "new_employee",
                "email": "new_employee@trustvault.test",
                "role": "VIEWER",
                "temporary_password": "A-strong-temporary-password-83!",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username="new_employee").exists())

    def test_19_admin_can_create_employee_account(self):
        """An Admin can create an account with a temporary password."""
        response = login(self.client, "admin_user", self.password)
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/users/",
            data={
                "username": "new_employee",
                "email": "new_employee@trustvault.test",
                "role": "VIEWER",
                "temporary_password": "A-strong-temporary-password-83!",
            },
        )

        self.assertEqual(response.status_code, 201)

        employee = User.objects.get(username="new_employee")
        self.assertEqual(employee.role, User.Role.VIEWER)
        self.assertTrue(employee.must_change_password)
        self.assertTrue(employee.check_password("A-strong-temporary-password-83!"))

        # The password must never be included in the API response.
        self.assertNotIn("temporary_password", response.json())
        self.assertNotIn("password", response.json())

    def test_20_profile_update_cannot_change_user_role(self):
        """A user cannot promote themselves through profile updates."""
        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)

        response = self.client.patch(
            "/api/auth/profile/",
            data={
                "first_name": "Updated",
                "email": "updated_viewer@trustvault.test",
                "role": "ADMIN",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        self.viewer.refresh_from_db()
        self.assertEqual(self.viewer.first_name, "Updated")
        self.assertEqual(
            self.viewer.email,
            "updated_viewer@trustvault.test",
        )
        self.assertEqual(self.viewer.role, User.Role.VIEWER)

    def test_21_successful_login_is_audited(self):
        response = login(self.client, "viewer", self.password)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.viewer,
                action="LOGIN",
                outcome=AuditEvent.Outcome.SUCCESS,
                details__username="viewer",
            ).exists()
        )

    def test_22_failed_login_is_audited_without_password(self):
        response = login(self.client, "viewer", "wrong-password")
        self.assertEqual(response.status_code, 400)
        event = AuditEvent.objects.get(
            actor__isnull=True,
            action="LOGIN",
            outcome=AuditEvent.Outcome.DENIED,
            details__username="viewer",
        )
        self.assertNotIn("password", event.details)
        self.assertEqual(event.details.get("reason"), "invalid_credentials")

    def test_23_logout_is_audited(self):
        login(self.client, "viewer", self.password)
        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.viewer,
                action="LOGOUT",
                outcome=AuditEvent.Outcome.SUCCESS,
            ).exists()
        )

    def test_24_password_change_is_audited(self):
        login(self.client, "viewer", self.password)
        response = self.client.post(
            "/api/auth/change-password/",
            data={
                "current_password": self.password,
                "new_password": "A-new-strong-password-83!",
            },
        )
        self.assertEqual(response.status_code, 200)
        event = AuditEvent.objects.get(
            actor=self.viewer,
            action="PASSWORD_CHANGE",
            outcome=AuditEvent.Outcome.SUCCESS,
        )
        self.assertNotIn("password", event.details)
        self.assertNotIn("new_password", event.details)

    def test_25_employee_creation_is_audited_without_temporary_password(self):
        login(self.client, "admin_user", self.password)
        response = self.client.post(
            "/api/auth/users/",
            data={
                "username": "audited_employee",
                "email": "audited_employee@trustvault.test",
                "role": "VIEWER",
                "temporary_password": "A-strong-temporary-password-83!",
            },
        )
        self.assertEqual(response.status_code, 201)
        event = AuditEvent.objects.get(
            actor=self.admin,
            action="USER_CREATE",
            outcome=AuditEvent.Outcome.SUCCESS,
            details__username="audited_employee",
        )
        self.assertNotIn("password", event.details)
        self.assertNotIn("temporary_password", event.details)
