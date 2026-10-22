# THREATS.md — TrustVault Threat Analysis

## 1. Purpose

This document describes the main security threats affecting TrustVault, the controls implemented to address them, the verification evidence available, and the remaining limitations.

TrustVault is a document-management application built with Django REST Framework and React. Its security depends on server-side authentication, role-based authorization, document-level permissions, protected file delivery, and audit logging.

Security claims in this document distinguish automated test results from manual verification and controls that still require additional work.

## 2. Status Legend

* ✅ **Implemented and tested:** The control is implemented and supported by automated tests or documented verification.
* ⚠️ **Partially implemented:** Some protection exists, but additional verification or hardening is required.
* 🔷 **Planned:** The control has not yet been implemented or verified.

Passing tests do not prove the absence of all vulnerabilities.

---

## T-01 — Unauthorized Document Access

**Threat:** An authenticated user accesses a document without the required permission.

**Attack vectors:**

* Requesting another user's document through a direct API request.
* Guessing or obtaining a document UUID.
* Calling the download endpoint without authorization.
* Attempting to bypass restrictions enforced by the frontend.

**Mitigations:**

* Enforce document authorization on the Django backend.
* Check document-level permissions before returning protected document data.
* Protect downloads with server-side authorization.
* Record relevant successful and denied security events in the audit trail.
* Treat frontend visibility as a usability feature, not a security boundary.

**Status:** ✅ Implemented; automated document and audit tests passed.

**Verification evidence:**

* The document and audit application test suites completed with 35 tests passing.
* Manual testing confirmed that a viewer with READ permission could access and download an authorized document.
* Manual testing confirmed that a viewer without the required permission received HTTP 403 for a protected operation.

The complete backend test suite also previously passed 49 tests.

**Remaining limitation:** These results do not establish that every possible authorization bypass has been tested.

---

## T-02 — IDOR (Insecure Direct Object Reference)

**Threat:** An attacker manipulates a document identifier to access or modify a document belonging to another user.

**Attack vectors:**

* Replacing a document UUID in an API URL.
* Sending direct requests that bypass frontend restrictions.
* Attempting to modify or delete another user's document.
* Requesting permission changes for a document the requester does not own.

**Mitigations:**

* Use UUIDs for public document identifiers.
* Enforce object-level authorization in backend views.
* Check ownership or explicit document permissions before protected operations.
* Test unauthorized access to document details, downloads, updates, and deletions.

**Status:** ⚠️ Implemented with automated testing.

The application uses UUID document identifiers and backend authorization checks. The document and audit test suites passed 35 tests.

**Remaining limitation:** UUIDs make identifiers harder to guess, but UUIDs are not authorization controls. Security depends on server-side permission checks for every protected operation.

---

## T-03 — Permission Revocation

**Threat:** A user continues accessing a document after their permission has been revoked.

**Attack vectors:**

* Revoking access only in the frontend.
* Caching permissions without rechecking them.
* Continuing to use a previously known document URL.
* Attempting another download or update after revocation.

**Mitigations:**

* Enforce document permissions on the backend.
* Recheck authorization on subsequent requests.
* Remove or update permission records when access is revoked.
* Ensure that hiding a document in the UI is not the only access restriction.

**Status:** ✅ Implemented and manually verified.

**Verification evidence:**

* A viewer could download a document while READ permission was granted.
* After READ permission was revoked, subsequent access and download attempts were denied.
* A viewer with EDIT permission could update document metadata.
* After the permission was changed to READ, subsequent metadata updates were denied with HTTP 403.

**Remaining limitation:** Revocation prevents subsequent authorized requests. It cannot retract a document that a user has already downloaded or copied.

---

## T-04 — Insecure File Storage and Delivery

**Threat:** Uploaded documents become accessible without authentication or appropriate authorization.

**Attack vectors:**

* Exposing uploaded files through a public static directory.
* Allowing direct access to stored files without permission checks.
* Deriving storage paths from user-controlled filenames.
* Misconfiguring file storage during deployment.

**Mitigations:**

* Serve protected downloads through authenticated backend views.
* Check document authorization before sending file contents.
* Validate uploaded files on the server.
* Avoid relying on frontend checks to protect stored documents.

**Status:** ⚠️ Implemented with deployment verification outstanding.

The application includes a protected document download endpoint and server-side permission checks.

**Remaining work:**

* Verify that production storage cannot be accessed directly without authorization.
* Verify that deployment configuration does not expose uploaded files publicly.
* Confirm production file-storage permissions and backup protections.

---

## T-05 — Malicious or Invalid File Uploads

**Threat:** An attacker uploads an invalid, oversized, or potentially malicious file.

**Attack vectors:**

* Renaming an unsupported file with an allowed extension.
* Uploading a file that exceeds the configured size limit.
* Supplying misleading content types.
* Uploading malformed documents or specially crafted archive files.

**Mitigations:**

* Apply a server-side file-type allowlist.
* Enforce the configured maximum upload size.
* Validate file content in addition to trusting the filename.
* Validate supported document and archive formats.
* Keep file validation on the backend.

**Status:** ⚠️ Implemented with limitations.

The current implementation supports a restricted set of document formats, including PDF, DOCX, XLSX, and TXT, with size and content validation.

**Remaining limitations:**

* No malware-scanning service is currently documented as implemented.
* File-format validation does not guarantee that a document is harmless.
* Protection against all archive-bomb and parser-based attacks has not been established.

---

## T-06 — Audit Log Tampering

**Threat:** An attacker modifies or deletes audit records to conceal unauthorized activity.

**Attack vectors:**

* Modifying database records directly.
* Altering or deleting historical audit events.
* Attempting to conceal a denied access request.
* Compromising a privileged account or the database host.

**Mitigations:**

* Record security events on the backend.
* Maintain a hash-linked audit chain.
* Verify event-chain integrity using the `verify_audit_chain` management command.
* Restrict access to audit-management operations.
* Record security-relevant outcomes, including successful and denied operations where implemented.

**Status:** ⚠️ Tamper-evident audit chain implemented and verified.

**Verification command:**

```powershell
python manage.py verify_audit_chain
```

**Latest observed result:**

```text
Audit chain verified: 14 events checked.
```

This result confirms that the verification command accepted the 14 recorded events at the time of the check.

**Important limitation:** A hash chain can reveal changes that break the verified chain, but it does not make the database impossible to tamper with. An attacker with sufficient database privileges might rewrite records and recalculate hashes. Stronger protection could include external append-only logging, independent integrity checkpoints, and restricted database administration.

The verification result is evidence of a successful check, not proof of absolute immutability.

---

## T-07 — Privilege Escalation

**Threat:** A viewer or document owner obtains administrative privileges or performs operations beyond their authority.

**Attack vectors:**

* Attempting to change the user's role through an API request.
* Calling administrator-only endpoints as a non-administrator.
* Granting permissions on documents without sufficient authority.
* Attempting to modify documents without EDIT permission.

**Mitigations:**

* Define platform roles: ADMIN, OWNER, and VIEWER.
* Enforce role checks on the backend.
* Prevent ordinary profile operations from changing protected role fields.
* Check ownership and permission-management authority before granting or revoking access.
* Enforce EDIT and READ restrictions on document operations.

**Status:** ✅ Implemented with automated testing.

The project includes role-based permission classes and document-level authorization checks.

**Verification evidence:**

* The document and audit application test suites passed 35 tests.
* Manual testing confirmed that a viewer with READ permission could not update document metadata.
* Manual testing confirmed that unauthorized deletion was denied.

**Remaining limitation:** These checks do not establish that every possible privilege-escalation path has been tested.

---

## T-08 — Session Security

**Threat:** An attacker steals or abuses a session to impersonate an authenticated user.

**Attack vectors:**

* Intercepting session cookies over an insecure connection.
* Exploiting an XSS vulnerability.
* Reusing a compromised session.
* Weak production session or cookie configuration.

**Mitigations:**

* Use Django session authentication.
* Use HTTP-only session cookies.
* Configure an appropriate SameSite cookie policy.
* Use HTTPS in production.
* Configure secure session cookies when HTTPS is enabled.
* Rotate the session identifier during login using Django's authentication mechanisms.

**Status:** ⚠️ Partially implemented; production configuration must be verified.

The local settings include HTTP-only and SameSite session-cookie protections.

**Remaining work:**

* Verify HTTPS and secure-cookie settings in the deployed environment.
* Review session expiry and timeout behavior.
* Implement or configure login rate limiting.
* Review session invalidation and incident-response procedures.

---

## T-09 — CSRF and CORS

**Threat:** A malicious website attempts to trigger authenticated state-changing requests, or the API permits requests from unintended origins.

**Attack vectors:**

* Submitting cross-site forms against authenticated endpoints.
* Misconfiguring allowed frontend origins.
* Allowing credentialed requests from untrusted origins.

**Mitigations:**

* Keep Django's CSRF middleware enabled.
* Use CSRF tokens for applicable state-changing requests.
* Use an explicit CORS origin allowlist.
* Avoid wildcard CORS origins when credentials are enabled.
* Configure trusted CSRF origins for the deployed frontend.

**Status:** ⚠️ Implemented; deployment configuration and authentication behavior require review.

The local application uses session authentication, a CSRF-token endpoint, and an allowlist-based CORS configuration.

**Remaining work:**

* Verify the actual production frontend origin.
* Verify CSRF and CORS behavior in the deployed environment.
* Review the login endpoint's CSRF design and associated protections.
* Confirm that all state-changing endpoints behave as expected.

---

## T-10 — Sensitive Information in Error Responses

**Threat:** Error responses reveal internal application details that help an attacker understand or exploit the system.

**Attack vectors:**

* Exposing Django debug pages in production.
* Returning stack traces or internal paths.
* Revealing secrets through configuration errors.
* Misconfiguring allowed hosts.

**Mitigations:**

* Disable Django debug mode in production.
* Configure allowed hosts explicitly.
* Avoid returning unnecessary internal exception details.
* Keep secrets in environment variables rather than source code.
* Review production logging and error handling.

**Status:** ⚠️ Production hardening requires verification.

**Remaining work:**

* Verify `DEBUG=False` in production.
* Verify `ALLOWED_HOSTS`.
* Review exception responses for information disclosure.
* Confirm that environment variables and secrets are configured correctly.

---

## 3. Additional Threats and Future Improvements

### Brute-force Login

**Risk:** An attacker repeatedly guesses account passwords.

**Status:** 🔷 Rate limiting and account-lockout protections require verification or implementation.

### Cross-Site Scripting (XSS)

**Risk:** Malicious content executes in a user's browser.

**Status:** ⚠️ React provides contextual escaping for ordinary rendered text, but this alone does not eliminate XSS. Review unsafe HTML rendering, dependencies, and production security headers.

### Dependency Vulnerabilities

**Risk:** Vulnerable dependencies introduce exploitable weaknesses.

**Status:** 🔷 Add dependency vulnerability checks to the development and release workflow.

### Clickjacking

**Risk:** A malicious website embeds the application to trick a user into interacting with it.

**Status:** ⚠️ Verify appropriate production framing protections, such as `X-Frame-Options` or CSP `frame-ancestors`.

### Database and Backup Security

**Risk:** Database or backup access exposes documents, user records, or audit events.

**Status:** 🔷 Production database permissions, backup protection, retention, and recovery procedures require separate verification.

### Malware Scanning

**Risk:** A valid-looking uploaded document contains malicious content.

**Status:** 🔷 No malware-scanning capability is currently claimed as implemented.

---

## 4. Verification Summary

The following results have been observed during development:

| Check                                | Observed result                            |
| ------------------------------------ | ------------------------------------------ |
| Full backend test suite              | 49 tests passed in an earlier run          |
| Document and audit application tests | 35 tests passed in the latest run          |
| OpenAPI schema endpoint              | HTTP 200                                   |
| Audit-chain verification             | 14 events checked successfully             |
| Document permission behavior         | READ, EDIT, and revocation manually tested |

These checks are snapshots from development, not a guarantee of security in every environment.

The document and audit test result is a subset of the full backend test result; do not add the two counts together.

## 5. Security Principles

TrustVault follows these principles:

1. Authorization decisions must be enforced by the backend.
2. A document identifier is not proof of permission.
3. Revoked access must be denied on subsequent requests.
4. Audit logs should make unauthorized activity easier to investigate.
5. A successful integrity check is not proof that tampering is impossible.
6. Security documentation must distinguish implemented controls from planned work.
7. Production deployment must be reviewed separately from local development.

---

*This threat model should be updated whenever a control changes, a new vulnerability is discovered, or verification results change. Claims should remain consistent with the code and available test evidence.*
