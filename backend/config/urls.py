"""
TrustVault URL Configuration
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.accounts.urls")),
    # Future apps:
    # path("api/", include("apps.documents.urls")),
    # path("api/", include("apps.audit.urls")),
]
