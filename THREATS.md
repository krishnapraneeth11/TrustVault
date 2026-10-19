# THREATS.md — TrustVault Threat Analysis

This document records security threats relevant to the TrustVault platform,
the planned mitigations, and — critically — which controls have actually been
implemented and tested versus which are only planned.

**Legend:**
- ✅ **Implemented and tested** — control exists in the codebase and has passing tests.
- 🔷 **Planned** — mitigation is designed; implementation is scheduled.
- ⚠️ **Partially implemented** — some aspects exist; others are outstanding.

---

## T-01 — Unauthorised Document Access

**Threat**: An authenticated user accesses a document they have no permission to view.

**Attack vectors**:
- Direct URL guessing or enumeration of document IDs.
- Modifying an API request to supply another user's document ID.

**Planned mitigations**:
- Every document endpoint checks the requesting user's permission record before returning data.
- Denied access attempts are logged to the audit trail.
- Document storage paths are not predictable from document IDs.

**Status**: 🔷 Planned — no document endpoints exist yet.

---

## T-02 — IDOR (Insecure Direct Object Reference)

**Threat**: An attacker manipulates a numeric or sequential document ID in a URL or request
body to access, modify, or delete documents belonging to other users.

**Attack vectors**:
- Incrementing `/api/documents/1/` to `/api/documents/2/`.
- Supplying another user's document ID in a share or download request.

**Planned mitigations**:
- Use UUIDs (not sequential integers) as public document identifiers.
- Object-level permission checks in every DRF view using a custom `IsDocumentAuthorised` permission class.
- Tests that verify a Viewer for document A cannot access document B.

**Status**: 🔷 Planned — UUID model field and permission class not yet created.

---

## T-03 — Permission Revocation Race Condition

**Threat**: A user whose access has been revoked continues to access a document
because the revocation is not immediately enforced.

**Attack vectors**:
- Revocation is cached and not checked on every request.
- Active download sessions continue after revocation.
- Frontend hides the button but the API still serves the document.

**Planned mitigations**:
- Permission checks performed server-side on every API request, never cached indefinitely.
- No frontend-only permission enforcement.
- Revoked permissions take effect on the next request.

**Status**: 🔷 Planned.

---

## T-04 — Insecure File Storage

**Threat**: Uploaded documents are stored in a publicly accessible location and can be
downloaded without authentication.

**Attack vectors**:
- Documents placed in `frontend/public/` or Django's `STATIC_ROOT`.
- Direct URL access to `MEDIA_ROOT` if it is web-accessible.
- Predictable file paths derived from document names or IDs.

**Planned mitigations**:
- `MEDIA_ROOT` is outside the web root and not served by the web server directly.
- Documents are served exclusively through authenticated Django views that check permissions.
- File names are replaced with random UUIDs on the server.
- `.env.example` documents the `MEDIA_ROOT` variable.

**Status**: 🔷 Planned — file serving views not yet implemented.

---

## T-05 — Upload Validation Bypass

**Threat**: A user uploads a malicious file (executable, script, oversized file, or
polyglot) by renaming it with an allowed extension.

**Attack vectors**:
- Uploading `malware.exe` renamed to `report.pdf`.
- Uploading a polyglot file that is both a valid PDF and an HTML script.
- Uploading a file that exceeds the configured size limit.
- Uploading a ZIP bomb to exhaust disk space.

**Planned mitigations**:
- Server-side MIME type validation using `python-magic` (reads file headers, not filename).
- Allowlist of permitted content types (PDF, DOCX, XLSX, PNG, JPEG, etc.).
- Configurable maximum file size enforced in Django before writing to disk.
- Uploaded files renamed to a UUID — original filename stored in the database only.
- Files quarantined before being marked as available.

**Status**: 🔷 Planned — upload endpoint does not exist yet.

---

## T-06 — Audit Log Tampering

**Threat**: An attacker or compromised administrator modifies or deletes audit log entries
to conceal unauthorised access.

**Attack vectors**:
- Direct database modification by a user with database access.
- A Django view that allows DELETE on audit records.
- An administrator using the Django admin panel to edit logs.

**Planned mitigations**:
- Audit log records are append-only; no UPDATE or DELETE exposed via API.
- Django admin panel restricted from modifying audit entries (`has_change_permission = False`).
- Database-level triggers or row-level security considered for production PostgreSQL.
- Logs include the server-side timestamp — clients cannot supply their own.

**Status**: 🔷 Planned — audit model not yet created.

---

## T-07 — Privilege Escalation

**Threat**: A Viewer or Document Owner manipulates a request to gain Administrator privileges
or to grant themselves additional permissions on a document they do not own.

**Attack vectors**:
- Supplying `role=admin` in a registration or profile-update request.
- Using a Viewer token to call an Admin-only endpoint.
- Modifying a permission record for a document they do not own.

**Planned mitigations**:
- Role field is not writable via API — set only by server-side logic and admins.
- Role-based permission classes applied at the view level in DRF.
- Object ownership verified before any permission mutation is allowed.
- Tests for each role attempting to access out-of-scope endpoints.

**Status**: 🔷 Planned — user model and role field not yet created.

---

## T-08 — Session Security

**Threat**: An attacker hijacks a valid session cookie to impersonate an authenticated user.

**Attack vectors**:
- Session cookie transmitted over HTTP (not HTTPS) and intercepted.
- XSS vulnerability used to steal the session cookie from `document.cookie`.
- Session fixation: attacker pre-sets a session ID before login.

**Planned mitigations**:
- `SESSION_COOKIE_SECURE = True` in production (requires HTTPS).
- `SESSION_COOKIE_HTTPONLY = True` — cookie inaccessible to JavaScript.
- `SESSION_COOKIE_SAMESITE = 'Lax'` — prevents cross-site sending.
- Session ID rotated on login to prevent fixation.
- Sessions expire after a configurable idle timeout.

**Status**: 🔷 Planned — session settings will be configured when auth is implemented.

---

## T-09 — CSRF and CORS

**Threat**:
- **CSRF**: A malicious website triggers a state-changing request on behalf of an
  authenticated user.
- **CORS**: The Django API accepts requests from unintended origins.

**Attack vectors**:
- Embedding a form on an attacker's page that POSTs to the TrustVault API.
- A browser making a cross-origin fetch from a malicious tab if CORS is misconfigured.

**Planned mitigations**:
- Django's built-in CSRF middleware enabled and never disabled.
- CSRF token required for all non-safe methods (POST, PUT, PATCH, DELETE).
- `CORS_ALLOWED_ORIGINS` set to an explicit allowlist — never `'*'` in production.
- `CORS_ALLOW_CREDENTIALS = True` combined with the allowlist.

**Status**: ⚠️ Partially planned — CORS and CSRF middleware are included in settings;
explicit allowlist values are supplied via environment variable. Full testing is pending.

---

## T-10 — Sensitive Information in Error Messages

**Threat**: Django error pages, stack traces, or API error responses leak internal details
such as file paths, database queries, model field names, or configuration values.

**Attack vectors**:
- `DEBUG = True` in production, exposing the full Django debug page.
- DRF serialiser validation errors that reveal internal model structure.
- Exception messages forwarded verbatim to the API response.

**Planned mitigations**:
- `DJANGO_DEBUG=False` enforced in production via environment variable.
- Custom DRF exception handler returns generic error messages to clients.
- Internal error details logged server-side only, never in the API response.
- `ALLOWED_HOSTS` correctly configured to prevent HTTP Host header attacks.

**Status**: ⚠️ Partially planned — `DEBUG` is read from the environment variable in settings.
Custom exception handler is not yet implemented.

---

## Additional Threats (Noted for Future Analysis)

- **Brute-force login**: Rate limiting and account lockout — 🔷 Planned.
- **Insecure password reset**: Secure token, expiry, single-use — 🔷 Planned.
- **Dependency vulnerabilities**: `pip audit`, `npm audit` in CI — 🔷 Planned.
- **SQL injection**: Django ORM used exclusively; raw queries will be reviewed — 🔷 Planned.
- **XSS**: React's JSX escaping + Content-Security-Policy header — 🔷 Planned.
- **Clickjacking**: `X-Frame-Options: DENY` header — 🔷 Planned.

---

*This document must be updated whenever a security control is implemented, tested,
or invalidated. Do not mark a control as ✅ implemented unless it has passing tests.*
