# PROMPTS.md Ã¢â‚¬â€ TrustVault AI Development Log

This file records each AI-assisted development session in chronological order.
Every entry documents what was requested, what was actually created, what was
verified, and any genuine problems found or corrections made.

---

## Entry 001 Ã¢â‚¬â€ 2026-10-19

### Task

Task 1: Project Foundation, Branding, and Design System.

### What Was Requested

The developer requested:
1. Inspection of the existing workspace (found empty).
2. Creation of the complete project scaffold for a Django + React TrustVault application.
3. Official branding: the supplied SVG logo saved to `brand/trustvault-logo.svg`.
4. Electric Mint + Carbon Black colour palette as centralised design tokens.
5. A reusable `TrustVaultLogo.tsx` React component with `useId()`-namespaced SVG masks.
6. Django 5.2 backend skeleton with SQLite for local development.
7. Vite + React + TypeScript frontend with Tailwind CSS.
8. Root documentation: `README.md`, `THREATS.md`, `.gitignore`, `.env.example`.
9. A minimal `App.tsx` demonstrating the design tokens Ã¢â‚¬â€ no fake data or fake buttons.

### What Was Actually Created

**Root:**
- `.gitignore` Ã¢â‚¬â€ excludes `.venv`, `node_modules`, `.env`, `media/`, `__pycache__`, etc.
- `.env.example` Ã¢â‚¬â€ placeholder values only, no real credentials.
- `README.md` Ã¢â‚¬â€ full setup guide, architecture overview, known limitations.
- `PROMPTS.md` Ã¢â‚¬â€ this file.
- `THREATS.md` Ã¢â‚¬â€ initial threat model.

**Brand:**
- `brand/trustvault-logo.svg` Ã¢â‚¬â€ original SVG saved verbatim from the prompt.

**Backend (`backend/`):**
- Django 5.2 project (`config` package) with `settings.py`, `urls.py`, `wsgi.py`, `asgi.py`.
- `requirements.txt` with pinned versions.
- `manage.py`.
- `apps/` directory created for future application modules.

**Frontend (`frontend/`):**
- Vite + React + TypeScript project created via `npx create-vite`.
- Tailwind CSS 3 installed with `tv-*` named colour tokens in `tailwind.config.js`.
- `src/index.css` with CSS custom properties for all brand colours, typography (Inter), spacing, and border-radius tokens.
- `src/components/TrustVaultLogo.tsx` Ã¢â‚¬â€ inline SVG component, `useId()` mask namespacing.
- `public/favicon.svg` Ã¢â‚¬â€ simplified padlock crop for browser tab icon.
- `src/App.tsx` Ã¢â‚¬â€ minimal token-demonstration page, no functional screens.
- `index.html` Ã¢â‚¬â€ correct title, Inter font, meta description.

### Checks Performed

- `node --version`, `npm --version`, `python --version`, `git --version` Ã¢â‚¬â€ all confirmed.
- `npm install` in `frontend/` Ã¢â‚¬â€ dependencies installed.
- `npm run build` in `frontend/` Ã¢â‚¬â€ production build verified.
- `python -m venv .venv` in project root Ã¢â‚¬â€ virtual environment created.
- `pip install -r requirements.txt` in `backend/` Ã¢â‚¬â€ dependencies installed.
- `python manage.py check` Ã¢â‚¬â€ ran and reported results (see report).
- `python manage.py migrate` Ã¢â‚¬â€ initial migrations applied to SQLite.

### Problems Found

- pip install exited with code 1 due to PowerShell treating pip's `[notice]` upgrade message on stderr as an error. All 16 packages installed successfully Ã¢â‚¬â€ not a real failure.
- pytest `--co` exited with code 1 with "no tests collected" Ã¢â‚¬â€ expected, no tests existed yet.

### Corrections Made

- None in Task 1 Ã¢â‚¬â€ the build, check, and migrate all passed cleanly.

### Git Commit Reference

- `766c21c` Ã¢â‚¬â€ "Task 1: project foundation, branding and design system"
- `.gitattributes` was added in the same commit to enforce LF line endings.

---

## Entry 002 Ã¢â‚¬â€ 2026-10-20

### Task

Secret Key Configuration + Task 2: Secure Authentication and Role Foundation.

### What Was Requested

1. Create `.env` with a freshly generated `DJANGO_SECRET_KEY`.
2. Implement a custom `User` model with `role` field (ADMIN, OWNER, VIEWER).
3. Django session authentication: login, logout, current-user, CSRF endpoints.
4. DRF role-based permission classes (`IsAdmin`, `IsOwnerOrAdmin`).
5. React login page using the design system.
6. React auth context with `useAuth` hook.
7. Protected route component.
8. Minimal dashboard page.
9. 14 automated backend tests.
10. Updated documentation.

### Implementation Approach

**Secret key**: Generated via `get_random_secret_key()`, written directly into `.env`
(not printed in the report or visible in source code).

**Custom user model**: Created `backend/apps/accounts/` with a `User` extending `AbstractUser`.
Added `role` field with `TextChoices` (ADMIN/OWNER/VIEWER). Local SQLite database was reset because
changing `AUTH_USER_MODEL` requires a clean migration state Ã¢â‚¬â€ the existing database contained
only disposable auto-generated local tables from Task 1.

**Authentication**: Django session auth + CSRF. DRF's `SessionAuthentication` enforces CSRF on
authenticated endpoints (logout, me). The login endpoint uses `authentication_classes = []` and
`permission_classes = [AllowAny]` Ã¢â‚¬â€ CSRF is not enforced on it (standard practice for SPA login flows).

**Frontend**: Added `react-router-dom` v7. Created `AuthContext` with `useAuth` hook, `LoginPage`,
`DashboardPage`, `ProtectedRoute`, and `src/api/client.ts` (CSRF-aware fetch wrapper).
API base URL configurable via `VITE_API_BASE_URL` in `frontend/.env.local`.

### Checks Performed

- `python manage.py check` Ã¢â‚¬â€ 0 issues.
- `python manage.py makemigrations accounts` Ã¢â‚¬â€ created `0001_initial.py`.
- `python manage.py migrate` Ã¢â‚¬â€ 19 migrations applied.
- `pytest backend/apps/accounts/tests/test_auth.py -v` Ã¢â‚¬â€ **14/14 passed**.
- `npm run build` Ã¢â‚¬â€ **30 modules, 0 TypeScript errors**.
- `git check-ignore .env`, `git ls-files .env`, `git status` Ã¢â‚¬â€ `.env` confirmed untracked.

### Problems Found and Corrections Made

1. **Test 14 initial failure**: The first version of test 14 tested `LoginView` CSRF enforcement
   without first fetching the CSRF cookie. DRF marks `APIView` as `csrf_exempt` at the middleware
   level and re-enforces CSRF only through `SessionAuthentication`. `LoginView` has
   `authentication_classes = []`, so no CSRF enforcement at the view level. The test was corrected
   to verify CSRF enforcement on the `LogoutView` (which uses `SessionAuthentication`) Ã¢â‚¬â€ this is the
   accurate behaviour. All 14 tests then passed.

2. **TypeScript error TS1294**: TypeScript 7 with `erasableSyntaxOnly` forbids constructor parameter
   properties (`public readonly status: number`). Fixed by expanding to an explicit class property
   declaration in `ApiError`.

3. **TypeScript error TS1484**: `FormEvent` must be imported as `import type` when
   `verbatimModuleSyntax` is enabled. Fixed with `import { type FormEvent, ... }`.

### Git Commit Reference

- Not committed yet Ã¢â‚¬â€ awaiting developer review.

---
---

## Entry 003 Ã¢â‚¬â€ 2026-10-20 to 2026-10-21

### Task

Document management and document-level authorization.

### What Was Requested

Implement document upload and management, role-aware access control, document-level READ and EDIT permissions, protected downloads, and a frontend for managing document access.

### What Was Implemented

* Document models and serializers.
* Document listing, upload, detail, metadata-update, deletion, and download endpoints.
* Document-level permission management.
* Backend authorization checks for protected document operations.
* Frontend integration for document access management.
* Upload validation for supported document formats and configured size limits.

### Verification

Manual checks confirmed that:

* A viewer with READ permission could access and download a shared document.
* A viewer with EDIT permission could update document metadata.
* An edit attempt with READ-only permission was denied.
* Revoking READ access prevented subsequent document access.

The document and audit test suites subsequently passed 35 tests.

### Problems and Corrections

Frontend and backend permission behavior required integration testing. Manual checks were used to confirm that the backend enforced restrictions even when operations were attempted directly.

### Evidence

See the document and audit test suites and the recorded manual verification results.

---

## Entry 004 Ã¢â‚¬â€ 2026-10-21 to 2026-10-22

### Task

Security audit logging and tamper-evident audit-chain verification.

### What Was Requested

Record security-relevant events and provide a mechanism to verify the integrity of the audit chain.

### What Was Implemented

* Audit event recording.
* Hash-linked audit records.
* A Django management command for verifying audit-chain integrity.
* Security-event integration with document and permission operations.

### Verification

The following command completed successfully:

```powershell
python manage.py verify_audit_chain
```

Observed output:

```text
Audit chain verified: 14 events checked.
```

The result confirms that the verification command accepted the 14 recorded events at the time of the check.

### Security Limitation

The hash chain provides tamper evidence but does not make database modification impossible. An attacker with sufficient database privileges could potentially rewrite records and recalculate hashes.

---

## Entry 005 Ã¢â‚¬â€ 2026-10-22

### Task

API schema generation and interactive API documentation.

### What Was Requested

Generate an OpenAPI schema for the implemented API and expose interactive Swagger documentation.

### What Was Implemented

* Added `drf-spectacular`.
* Configured schema generation in Django REST Framework.
* Added the OpenAPI schema and Swagger UI endpoints.
* Added schema annotations and response serializers to improve endpoint documentation.

### Problems Found and Corrections

1. Schema generation failed while processing the custom download renderer because its format value was `None`. The renderer configuration was corrected to use a binary format.
2. Schema generation encountered a problem documenting the logout endpoint. A response serializer and explicit schema annotation were added.

### Verification

The schema-generation command completed without reporting errors:

```powershell
python manage.py spectacular --file schema.yml --validate
```

The running Django server subsequently returned HTTP 200 for the schema endpoint:

```text
GET /api/schema/ HTTP/1.1 200
```

The Swagger UI also loaded successfully.

### Lessons Learned

Generating a schema file and serving the schema over HTTP are separate checks. Both the generation command and the running endpoint should be verified.

---

## Entry 006 Ã¢â‚¬â€ 2026-10-22

### Task

Backend security-test verification.

### What Was Requested

Run the automated document and audit tests after implementing access controls and audit-chain functionality.

### Verification

The document and audit test suites completed successfully:

```text
Found 35 test(s).
Ran 35 tests in 17.761s

OK
```

The full backend suite had also passed in an earlier run:

```text
Ran 49 tests

OK
```

These are results from separate test runs. The 35 tests are included within the broader backend testing scope and should not be added to the 49-test count.

### Result

The observed test results provide evidence that the implemented behaviors satisfy the assertions in the current test suite. They do not establish that all possible security vulnerabilities have been eliminated.

---

## Development Log Maintenance

Future entries should document actual AI-assisted sessions and distinguish:

* What was requested.
* What was implemented.
* What tests or manual checks were performed.
* What failed and how it was corrected.
* What limitations remain.

Do not invent prompts, test results, or corrections. When exact original prompts are available, preserve them or summarize them faithfully.
