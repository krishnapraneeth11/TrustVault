"""
TrustVault URL Configuration
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # API routes will be registered here as applications are built:
    # path("api/", include("apps.api.urls")),
]
