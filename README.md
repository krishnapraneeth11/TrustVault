# TrustVault

> **Secure Documents. Verified Access.**

TrustVault is a security-focused enterprise document-sharing and audit platform.
It provides role-based access control, per-document permissions, secure previews,
and a tamper-evident audit trail — built as an individual software engineering
hiring challenge.

---

## Technology Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Backend   | Python 3.11, Django 5.2, Django REST Framework      |
| Database  | PostgreSQL (production) · SQLite (local dev)        |
| Auth      | Django sessions + CSRF (JWT planned for API)        |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS            |
| Testing   | pytest, pytest-django (backend) · Vitest (frontend) |
| Dev OS    | Windows 11 / PowerShell                             |

---

## Planned Architecture

```
TrustVault/
├── brand/                  # Official SVG logo and brand assets
├── backend/                # Django project
│   ├── config/             # Django settings, URLs, WSGI/ASGI
│   ├── apps/
│   │   ├── accounts/       # User model, roles (Admin / Owner / Viewer)
│   │   ├── documents/      # Document model, upload, permissions
│   │   ├── audit/          # Audit log model and event recording
│   │   └── api/            # DRF router and serializers
│   ├── requirements.txt
│   └── manage.py
├── frontend/               # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client (axios / fetch wrappers)
│   │   └── styles/         # Design tokens and global CSS
│   ├── public/             # Static assets (favicon, etc.)
│   └── index.html
├── docs/                   # Architecture diagrams, API docs
├── .env.example
├── .gitignore
├── PROMPTS.md
├── THREATS.md
└── README.md
```

---

## Security Design Goals

- **Authentication**: Session-based authentication with CSRF protection.
  JWT access tokens planned for the REST API.
- **Authorisation**: All permission checks enforced server-side in Django.
  The frontend never makes decisions about what data a user may see.
- **Roles**: Administrator, Document Owner, Viewer — enforced at the view layer.
- **Audit trail**: Every access attempt (successful and denied) recorded
  server-side with timestamp, user, document, and action.
- **Upload validation**: File type, size, and content validated server-side.
  MIME-type sniffing, not filename extension alone.
- **Secure delivery**: Documents served through authenticated Django views,
  not exposed as static files.
- **Secrets**: All credentials in environment variables, never in source code.
- **CORS**: Allowlist-based, never wildcard in production.

---

## Windows Setup Instructions

### Prerequisites

Ensure the following are installed:

| Tool     | Required Version | Check Command       |
|----------|-----------------|---------------------|
| Python   | 3.11            | `python --version`  |
| Node.js  | 18+             | `node --version`    |
| npm      | 9+              | `npm --version`     |
| Git      | any recent      | `git --version`     |
| PostgreSQL | 14+           | (for production)    |

### 1. Clone the repository

```powershell
git clone <repository-url> TrustVault
cd TrustVault
```

### 2. Environment configuration

```powershell
Copy-Item .env.example .env
# Edit .env and fill in your actual values before continuing.
```

---

## Backend Installation

```powershell
# From the project root
cd backend

# Create and activate a virtual environment
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run Django system checks
python manage.py check

# Apply migrations (SQLite by default for local dev)
python manage.py migrate

# Create a superuser (for the admin panel)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

> **Note — Database configuration:**
> The backend is configured for SQLite in local development for convenience.
> PostgreSQL is required for production. Set `DB_ENGINE`, `DB_NAME`, `DB_USER`,
> `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in your `.env` file, then re-run
> `python manage.py migrate`.

---

## Frontend Installation

```powershell
# From the project root
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev

# Build for production
npm run build
```

The frontend dev server runs on `http://localhost:5173` by default.
The Django API must be running on `http://localhost:8000` for API calls to work.

---

## Environment Configuration

See [`.env.example`](.env.example) for all supported variables.

Key variables:

| Variable             | Purpose                                          |
|----------------------|--------------------------------------------------|
| `DJANGO_SECRET_KEY`  | Django cryptographic signing key — keep secret   |
| `DJANGO_DEBUG`       | Set `False` in production                        |
| `DB_*`               | PostgreSQL connection settings                   |
| `VITE_API_BASE_URL`  | API base URL used by the React frontend          |
| `MEDIA_ROOT`         | Absolute path for uploaded document storage      |

---

## Running Tests

### Backend

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
pytest
```

### Frontend

```powershell
cd frontend
npm run test        # Vitest (when test suite is added)
npm run type-check  # TypeScript type checking
```

---

## Known Limitations (Task 1)

- Authentication is not yet implemented.
- Document upload, preview, and download are not yet implemented.
- Permission management UI is not yet implemented.
- Audit logging is not yet implemented.
- PostgreSQL has not been tested (SQLite used locally).
- No automated tests exist yet — test scaffolding is planned for Task 2.
- The frontend shows only the design system foundation; no functional screens exist.

These are honest limitations, not oversights. Each will be addressed in subsequent tasks.

---

## Recommended Next Task

**Task 2 — Authentication**: Implement Django user model with roles,
session-based login/logout, CSRF handling, and the React login page.
