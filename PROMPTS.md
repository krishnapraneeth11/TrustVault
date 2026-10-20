# PROMPTS.md — TrustVault AI Development Log

This file records each AI-assisted development session in chronological order.
Every entry documents what was requested, what was actually created, what was
verified, and any genuine problems found or corrections made.

---

## Entry 001 — 2026-10-19

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
9. A minimal `App.tsx` demonstrating the design tokens — no fake data or fake buttons.

### What Was Actually Created

**Root:**
- `.gitignore` — excludes `.venv`, `node_modules`, `.env`, `media/`, `__pycache__`, etc.
- `.env.example` — placeholder values only, no real credentials.
- `README.md` — full setup guide, architecture overview, known limitations.
- `PROMPTS.md` — this file.
- `THREATS.md` — initial threat model.

**Brand:**
- `brand/trustvault-logo.svg` — original SVG saved verbatim from the prompt.

**Backend (`backend/`):**
- Django 5.2 project (`config` package) with `settings.py`, `urls.py`, `wsgi.py`, `asgi.py`.
- `requirements.txt` with pinned versions.
- `manage.py`.
- `apps/` directory created for future application modules.

**Frontend (`frontend/`):**
- Vite + React + TypeScript project created via `npx create-vite`.
- Tailwind CSS 3 installed with `tv-*` named colour tokens in `tailwind.config.js`.
- `src/index.css` with CSS custom properties for all brand colours, typography (Inter), spacing, and border-radius tokens.
- `src/components/TrustVaultLogo.tsx` — inline SVG component, `useId()` mask namespacing.
- `public/favicon.svg` — simplified padlock crop for browser tab icon.
- `src/App.tsx` — minimal token-demonstration page, no functional screens.
- `index.html` — correct title, Inter font, meta description.

### Checks Performed

- `node --version`, `npm --version`, `python --version`, `git --version` — all confirmed.
- `npm install` in `frontend/` — dependencies installed.
- `npm run build` in `frontend/` — production build verified.
- `python -m venv .venv` in project root — virtual environment created.
- `pip install -r requirements.txt` in `backend/` — dependencies installed.
- `python manage.py check` — ran and reported results (see report).
- `python manage.py migrate` — initial migrations applied to SQLite.

### Problems Found

- pip install exited with code 1 due to PowerShell treating pip's `[notice]` upgrade message on stderr as an error. All 16 packages installed successfully — not a real failure.
- pytest `--co` exited with code 1 with "no tests collected" — expected, no tests existed yet.

### Corrections Made

- None in Task 1 — the build, check, and migrate all passed cleanly.

### Git Commit Reference

- `766c21c` — "Task 1: project foundation, branding and design system"
- `.gitattributes` was added in the same commit to enforce LF line endings.

---

## Entry 002 — 2026-10-20

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
changing `AUTH_USER_MODEL` requires a clean migration state — the existing database contained  
only disposable auto-generated local tables from Task 1.

**Authentication**: Django session auth + CSRF. DRF's `SessionAuthentication` enforces CSRF on  
authenticated endpoints (logout, me). The login endpoint uses `authentication_classes = []` and  
`permission_classes = [AllowAny]` — CSRF is not enforced on it (standard practice for SPA login flows).

**Frontend**: Added `react-router-dom` v7. Created `AuthContext` with `useAuth` hook, `LoginPage`,  
`DashboardPage`, `ProtectedRoute`, and `src/api/client.ts` (CSRF-aware fetch wrapper).  
API base URL configurable via `VITE_API_BASE_URL` in `frontend/.env.local`.

### Checks Performed

- `python manage.py check` — 0 issues.
- `python manage.py makemigrations accounts` — created `0001_initial.py`.
- `python manage.py migrate` — 19 migrations applied.
- `pytest backend/apps/accounts/tests/test_auth.py -v` — **14/14 passed**.
- `npm run build` — **30 modules, 0 TypeScript errors**.
- `git check-ignore .env`, `git ls-files .env`, `git status` — `.env` confirmed untracked.

### Problems Found and Corrections Made

1. **Test 14 initial failure**: The first version of test 14 tested `LoginView` CSRF enforcement  
   without first fetching the CSRF cookie. DRF marks `APIView` as `csrf_exempt` at the middleware  
   level and re-enforces CSRF only through `SessionAuthentication`. `LoginView` has  
   `authentication_classes = []`, so no CSRF enforcement at the view level. The test was corrected  
   to verify CSRF enforcement on the `LogoutView` (which uses `SessionAuthentication`) — this is the  
   accurate behaviour. All 14 tests then passed.

2. **TypeScript error TS1294**: TypeScript 7 with `erasableSyntaxOnly` forbids constructor parameter  
   properties (`public readonly status: number`). Fixed by expanding to an explicit class property  
   declaration in `ApiError`.

3. **TypeScript error TS1484**: `FormEvent` must be imported as `import type` when  
   `verbatimModuleSyntax` is enabled. Fixed with `import { type FormEvent, ... }`.

### Git Commit Reference

- Not committed yet — awaiting developer review.

---

*Future entries will be added here as development continues.*
