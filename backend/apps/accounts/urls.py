from django.urls import path

from .views import (
    AdminProbeView,
    AdminUserDeleteView,
    AdminUserListCreateView,
    AdminUserStatusView,
    ChangePasswordView,
    CsrfTokenView,
    LoginView,
    LogoutView,
    MeView,
    ProfileView,
)

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/profile/", ProfileView.as_view(), name="auth-profile"),
    path(
        "auth/change-password/",
        ChangePasswordView.as_view(),
        name="auth-change-password",
    ),
    path("auth/admin/", AdminProbeView.as_view(), name="auth-admin-probe"),
    path("auth/users/", AdminUserListCreateView.as_view(), name="auth-users"),
    path(
        "auth/users/<int:user_id>/status/",
        AdminUserStatusView.as_view(),
        name="auth-user-status",
    ),
    path(
        "auth/users/<int:user_id>/delete/",
        AdminUserDeleteView.as_view(),
        name="admin-user-delete",
    ),
]
