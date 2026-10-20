"""
TrustVault accounts URL configuration.
"""

from django.urls import path

from .views import AdminProbeView, CsrfTokenView, LoginView, LogoutView, MeView

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/admin/", AdminProbeView.as_view(), name="auth-admin-probe"),
]
