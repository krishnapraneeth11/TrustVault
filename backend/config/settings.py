"""
TrustVault Django Settings
==========================

Local development uses SQLite for convenience.
PostgreSQL is required for production — set DB_* environment variables in .env.

Security-sensitive settings are loaded from environment variables via python-dotenv.
Never commit a real .env file.
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the project root (one level above backend/)
load_dotenv(BASE_DIR.parent / ".env")


# ── Core ──────────────────────────────────────────────────────────────────────
_INSECURE_FALLBACK_KEY = "django-insecure-CHANGE-ME-set-DJANGO_SECRET_KEY-in-dot-env"

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", _INSECURE_FALLBACK_KEY)

DEBUG = os.environ.get("DJANGO_DEBUG", "True").strip().lower() in ("true", "1", "yes")

# Guard: refuse to start in production with the insecure fallback key.
if not DEBUG and SECRET_KEY == _INSECURE_FALLBACK_KEY:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set to a secure random value in production. "
        'Run: python -c "from django.core.management.utils import get_random_secret_key; '
        'print(get_random_secret_key())" and set the result in your .env file.'
    )

ALLOWED_HOSTS: list[str] = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# CSRF trusted origins — must match the frontend origin for session authentication.
CSRF_TRUSTED_ORIGINS: list[str] = [
    o.strip()
    for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]


# ── Custom User Model ─────────────────────────────────────────────────────────
# Must be set before the first migration. Changing this later requires a DB reset.
AUTH_USER_MODEL = "accounts.User"


# ── Installed Apps ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    # TrustVault applications
    "apps.accounts",
    "apps.documents",
    "apps.audit",
]


# ── Middleware ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must be before CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",  # CSRF protection — do not remove
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ── URL Configuration ─────────────────────────────────────────────────────────
ROOT_URLCONF = "config.urls"


# ── Templates ─────────────────────────────────────────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ── WSGI / ASGI ───────────────────────────────────────────────────────────────
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ── Database ──────────────────────────────────────────────────────────────────
# SQLite is used for local development.
# Set DB_ENGINE=django.db.backends.postgresql and the DB_* variables in .env
# to switch to PostgreSQL for staging or production.
_db_engine = os.environ.get("DB_ENGINE", "django.db.backends.sqlite3")

if _db_engine == "django.db.backends.postgresql":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "trustvault"),
            "USER": os.environ.get("DB_USER", "trustvault_user"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }
else:
    # Default: SQLite for local development
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# ── Password Validation ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ── Static Files ──────────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"


# ── Media Files (uploaded documents) ─────────────────────────────────────────
# IMPORTANT: MEDIA_ROOT must NOT be inside the frontend public directory.
# Documents are served through authenticated views, not as public static files.
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media")))


# ── Default Primary Key ───────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ── CORS ──────────────────────────────────────────────────────────────────────
# Allowlist only — never use CORS_ALLOW_ALL_ORIGINS = True in production.
CORS_ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True


# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}
SPECTACULAR_SETTINGS = {
    "TITLE": "TrustVault API",
    "DESCRIPTION": (
        "Secure document management with role-based access control, "
        "document-level permissions, and auditable security events."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}


# ── Session ───────────────────────────────────────────────────────────────────
SESSION_COOKIE_HTTPONLY = True  # Prevent JS access to session cookie
SESSION_COOKIE_SAMESITE = "Lax"  # Prevent cross-site cookie sending

# In production: set these to True and serve over HTTPS
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True


# ── Security Headers (production) ─────────────────────────────────────────────
# These will be enabled when HTTPS is configured:
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_SSL_REDIRECT = True
X_FRAME_OPTIONS = "DENY"  # Prevent clickjacking
