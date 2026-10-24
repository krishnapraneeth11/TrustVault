TrustVault

Secure Documents. Verified Access.

TrustVault is a security-focused document management and sharing application built with Django REST Framework and React. It combines role-based access control, document-level permissions, protected document downloads, and a tamper-evident audit trail.


Features

Authentication and Roles

Session-based authentication using Django.

CSRF-aware API interactions.

Three platform roles: ADMIN, OWNER, and VIEWER.

Protected frontend routes and authenticated API endpoints.

Document Management

Upload and manage documents.

Organize documents by category.

Search and list documents available to the current user.

Download documents through a protected backend endpoint.

Update document metadata when authorized.

Delete documents subject to authorization rules.

Document-Level Permissions

Grant users READ or EDIT access to a document.

Review existing document permissions.

Revoke access.

Enforce permissions on the backend rather than relying on frontend controls.

Audit and Integrity

Record security-relevant document and permission events.

Maintain a hash-linked audit chain.

Verify audit-chain integrity using a Django management command.

API Documentation

OpenAPI schema generation.

Interactive Swagger UI.

Documented authentication, document, download, and permission endpoints.

Technology Stack

Layer

Technology

Backend

Python 3.11, Django 5.2, Django REST Framework 3.16.0

Database

SQLite for local development

Authentication

Django sessions and CSRF

Frontend

React 19, TypeScript, Vite, Tailwind CSS

API documentation

drf-spectacular, OpenAPI, Swagger UI

Backend testing

Django test framework, pytest, pytest-django

Version control

Git

PostgreSQL may be considered for production deployment, but production database support must be configured and verified separately.

Architecture

TrustVault/
├── brand/
│   └── trustvault-logo.svg
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── documents/
│   │   ├── audit/
│   │   └── management/
│   │       └── commands/
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

The backend is responsible for authentication, authorization, document validation, protected file delivery, and audit events. The React frontend communicates with the backend through HTTP API requests.

Prerequisites

Install:

Python 3.11

Node.js and npm

Git

Visual Studio Code or another editor

The commands below use Windows PowerShell.

Installation and Local Development

1. Obtain the project

Clone the repository, then enter the project directory:

git clone <repository-url>
cd TrustVault

If the project is already on your computer, open its existing directory instead.

2. Configure environment variables

From the project root:

Copy-Item .env.example .env

Review .env.example and the Django settings, then set the values required for your local environment.

Security: Never commit .env, actual secret keys, passwords, or other credentials. Do not reuse development secrets in production.

3. Set up the backend

From the project root, create a virtual environment:

python -m venv .venv

Activate it:

.\.venv\Scripts\Activate.ps1

If PowerShell blocks activation in the current terminal, you can use the virtual-environment Python executable directly in subsequent commands.

Install backend dependencies:

cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt

Run Django's system checks and database migrations:

..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py migrate

Create an administrator account if required:

..\.venv\Scripts\python.exe manage.py createsuperuser

Start the backend:

..\.venv\Scripts\python.exe manage.py runserver

The local backend is available at:

http://127.0.0.1:8000/

Keep the backend terminal open while using the application.

4. Set up the frontend

Open a second terminal. From the project root, run:

cd frontend
npm install
npm run dev

Use the local URL printed by Vite. The default is:

http://localhost:5173/

The frontend requires the Django backend to be running and its API base URL to be configured correctly.

To create a production frontend build, run this from the frontend directory:

npm run build

API Documentation

Start the Django backend before opening these endpoints.

Swagger UI

http://127.0.0.1:8000/api/docs/

Use Swagger UI to explore the documented API operations.

OpenAPI Schema

http://127.0.0.1:8000/api/schema/

This endpoint returns the generated OpenAPI specification. It normally displays raw schema content rather than the interactive Swagger interface.

Main API Endpoints

Endpoint

Method

Purpose

/api/auth/csrf/

GET

Obtain a CSRF token

/api/auth/login/

POST

Authenticate a user

/api/auth/logout/

POST

End the current session

/api/auth/me/

GET

Retrieve the current user

/api/documents/

GET

List accessible documents

/api/documents/

POST

Upload a document

/api/documents/<document_id>/

GET

Retrieve document details

/api/documents/<document_id>/

PATCH

Update document metadata

/api/documents/<document_id>/

DELETE

Delete a document when authorized

/api/documents/<document_id>/download/

GET

Download a document when authorized

/api/documents/<document_id>/permissions/

GET

List document permissions

/api/documents/<document_id>/permissions/

POST

Grant or update a permission

/api/documents/<document_id>/permissions/<permission_id>/

DELETE

Revoke a permission

Authentication and permission requirements vary by endpoint. Consult Swagger UI and the backend implementation for exact request and response details.

Security Model

Server-Side Authorization

The backend is the security boundary. Users should not obtain additional privileges simply by modifying the frontend or submitting a different document identifier.

Document Permissions

READ grants the supported read and download operations. EDIT permits the supported metadata-editing operations. Deletion and permission management have their own authorization rules.

Revocation prevents access on subsequent requests when the backend checks the updated permission state. It cannot retrieve a file that a user has already downloaded.

Upload Validation

The implementation restricts supported file types and applies size and content validation. These checks reduce risk but do not guarantee that every uploaded document is harmless.

Audit Integrity

The audit-chain verification command checks the integrity of recorded events and their hash links. A successful check does not make the underlying database impossible to tamper with, especially if an attacker has sufficient database privileges.

See THREATS.md for threat analysis, known limitations, and verification evidence.

Running Tests

Run commands from the project root unless otherwise specified.

Full backend test suite

cd backend
..\.venv\Scripts\python.exe manage.py test

Document and audit tests

From the backend directory:

..\.venv\Scripts\python.exe manage.py test apps.documents apps.audit

Verify the audit chain

From the backend directory, with the backend environment configured:

..\.venv\Scripts\python.exe manage.py verify_audit_chain

The number of events reported depends on the database contents. Run the command against the current database to verify its current state.

Frontend production build

From the frontend directory:

npm run build

A successful build checks whether the frontend can produce its configured production bundle. It does not replace browser-based testing.

Environment Variables

Review .env.example and the Django settings for the variables supported by this checkout. Configuration areas may include:

Setting

Purpose

Django secret key

Cryptographic signing

Debug mode

Enables or disables Django debug behavior

Allowed hosts

Restricts accepted host headers

Database settings

Configures the database connection

Media storage

Determines uploaded-file storage

Frontend API base URL

Configures the backend URL used by React

CORS and CSRF origins

Restricts permitted browser origins

The exact variable names and defaults depend on the current settings implementation.

Production Considerations

Before production use:

Disable Django debug mode.

Configure allowed hosts explicitly.

Serve the application over HTTPS.

Enable secure session and CSRF cookies where appropriate.

Configure persistent media storage and backups for uploaded documents.

Use production-grade secrets and a production database configuration.

Review deployment settings, authorization behavior, and the threat analysis in THREATS.md.

Deployment

The live deployment may take a little time to respond on its first request if the hosting service has put the free instance to sleep. If the page or API is slow to load initially, wait briefly and retry.