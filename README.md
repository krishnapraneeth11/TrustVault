# TrustVault

> **Secure Documents. Verified Access.**

TrustVault is a security-focused document management and sharing application built with **Django REST Framework** and **React**. It combines role-based access control, document-level permissions, protected document downloads, and a tamper-evident audit trail.



---

## ✨ Features

| Feature | What it does |
|---|---|
| **Authentication & Roles** | Django session authentication, CSRF-aware API interactions, protected routes, and `ADMIN`, `OWNER`, and `VIEWER` roles. |
| **Document Management** | Upload, categorize, search, view, update, download, and delete documents according to authorization rules. |
| **Document Permissions** | Grant, review, and revoke document-level `READ` or `EDIT` access. Permissions are enforced by the backend. |
| **Audit & Integrity** | Records security-relevant events in a hash-linked audit chain and provides a command to verify chain integrity. |
| **API Documentation** | OpenAPI schema and interactive Swagger UI for exploring API endpoints. |

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, Django 5.2, Django REST Framework 3.16.0 |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Database** | SQLite for local development |
| **Authentication** | Django sessions and CSRF |
| **API documentation** | drf-spectacular, OpenAPI, Swagger UI |
| **Testing** | Django test framework, pytest, pytest-django |
| **Version control** | Git |

> PostgreSQL may be considered for production, but production database support must be configured and verified separately.

## 🏗️ Architecture

```text
TrustVault/
├── brand/
│   └── trustvault-logo.svg
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── documents/
│   │   └── audit/
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
├── .env.example
├── PROMPTS.md
├── THREATS.md
└── README.md
```

The **Django backend** is responsible for authentication, authorization, document validation, protected file delivery, and audit events. The **React frontend** communicates with the backend through HTTP API requests.

## 🚀 Getting Started

### Prerequisites

- Python 3.11
- Node.js and npm
- Git
- Visual Studio Code or another editor

The following commands use **Windows PowerShell**.

### 1. Clone the repository

```powershell
git clone https://github.com/krishnapraneeth11/TrustVault.git
cd TrustVault
```

If the project is already on your computer, open its existing directory instead.

### 2. Configure environment variables

From the project root:

```powershell
Copy-Item .env.example .env
```

Review `.env.example` and the Django settings, then set the values required by your local environment.

> **Security:** Never commit `.env`, actual secret keys, passwords, or other credentials. Do not reuse development secrets in production.

### 3. Set up the backend

From the project root, create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies and enter the backend directory:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Run Django checks and database migrations:

```powershell
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py migrate
```

Create an administrator account if required:

```powershell
..\.venv\Scripts\python.exe manage.py createsuperuser
```

Start the backend:

```powershell
..\.venv\Scripts\python.exe manage.py runserver
```

The local backend runs at **http://127.0.0.1:8000/**. Keep this terminal open while using the application.

### 4. Set up the frontend

Open a **second terminal**. From the project root, run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The default is **http://localhost:5173/**.

The frontend requires the Django backend to be running and its API base URL to be configured correctly.

To create a production frontend build, run this from the `frontend` directory:

```powershell
npm run build
```

## 📚 API Documentation

Start the Django backend before opening these endpoints.

| Resource | Local URL | Description |
|---|---|---|
| **Swagger UI** | [`/api/docs/`](http://127.0.0.1:8000/api/docs/) | Interactive API documentation |
| **OpenAPI schema** | [`/api/schema/`](http://127.0.0.1:8000/api/schema/) | Generated OpenAPI specification |

## 🔌 Main API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/csrf/` | `GET` | Obtain a CSRF token |
| `/api/auth/login/` | `POST` | Authenticate a user |
| `/api/auth/logout/` | `POST` | End the current session |
| `/api/auth/me/` | `GET` | Retrieve the current user |
| `/api/documents/` | `GET` | List accessible documents |
| `/api/documents/` | `POST` | Upload a document |
| `/api/documents/<document_id>/` | `GET` | Retrieve document details |
| `/api/documents/<document_id>/` | `PATCH` | Update document metadata |
| `/api/documents/<document_id>/` | `DELETE` | Delete a document when authorized |
| `/api/documents/<document_id>/download/` | `GET` | Download a document when authorized |
| `/api/documents/<document_id>/permissions/` | `GET` | List document permissions |
| `/api/documents/<document_id>/permissions/` | `POST` | Grant or update a permission |
| `/api/documents/<document_id>/permissions/<permission_id>/` | `DELETE` | Revoke a permission |

Authentication and permission requirements vary by endpoint. Consult Swagger UI and the backend implementation for exact request and response details.

## 🔐 Security Model

### Server-side authorization
The backend is the security boundary. Users should not obtain additional privileges simply by modifying the frontend or submitting a different document identifier.

### Document permissions
- `READ` grants the supported read and download operations.
- `EDIT` permits the supported metadata-editing operations.
- Deletion and permission management have their own authorization rules.

Revocation prevents access on subsequent requests when the backend checks the updated permission state. It cannot retrieve a file that a user has already downloaded.

### Upload validation
The implementation restricts supported file types and applies size and content validation. These checks reduce risk but do not guarantee that every uploaded document is harmless.

### Audit integrity
The audit-chain verification command checks the integrity of recorded events and their hash links. A successful check does not make the underlying database impossible to tamper with, especially if an attacker has sufficient database privileges.

See [`THREATS.md`](THREATS.md) for the threat analysis, known limitations, and verification evidence.

## 🧪 Running Tests

Run commands from the project root unless otherwise specified.

### Full backend test suite

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py test
```

### Document and audit tests

From the `backend` directory:

```powershell
..\.venv\Scripts\python.exe manage.py test apps.documents apps.audit
```

### Verify the audit chain

From the `backend` directory, with the backend environment configured:

```powershell
..\.venv\Scripts\python.exe manage.py verify_audit_chain
```

The number of events reported depends on the database contents. Run the command against the current database to verify its current state.

### Frontend production build

From the `frontend` directory:

```powershell
npm run build
```

A successful build checks whether the frontend can produce its configured production bundle. It does not replace browser-based testing.

## ⚙️ Environment Variables

Review `.env.example` and the Django settings for the variables supported by this checkout. Configuration areas may include:

| Setting | Purpose |
|---|---|
| Django secret key | Cryptographic signing |
| Debug mode | Enables or disables Django debug behavior |
| Allowed hosts | Restricts accepted host headers |
| Database settings | Configures the database connection |
| Media storage | Determines uploaded-file storage |
| Frontend API base URL | Configures the backend URL used by React |
| CORS and CSRF origins | Restricts permitted browser origins |

The exact variable names and defaults depend on the current settings implementation.

## ☁️ Deployment Notes

The live deployment may take a little time to respond to the first request if the hosting service has put the free instance to sleep. If the page or API is slow initially, wait briefly and retry.

Before production use:
- Disable Django debug mode.
- Configure allowed hosts explicitly.
- Serve the application over HTTPS.
- Enable secure session and CSRF cookies where appropriate.
- Configure persistent media storage and backups for uploaded documents.
- Use production-grade secrets and a production database configuration.
- Review deployment settings, authorization behavior, and `THREATS.md`.

---

**TrustVault** — Secure Documents. Verified Access.
