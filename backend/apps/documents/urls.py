from django.urls import path

from .views import (
    DocumentListCreateView,
    DocumentDetailView,
    DocumentDownloadView,
    DocumentPermissionListCreateView,
    DocumentPermissionDetailView,
)

urlpatterns = [
    path(
        "documents/",
        DocumentListCreateView.as_view(),
        name="document-list-create",
    ),
    path(
        "documents/<uuid:document_id>/",
        DocumentDetailView.as_view(),
        name="document-detail",
    ),
    path(
        "documents/<uuid:document_id>/download/",
        DocumentDownloadView.as_view(),
        name="document-download",
    ),
    path(
        "documents/<uuid:document_id>/permissions/",
        DocumentPermissionListCreateView.as_view(),
        name="document-permission-list-create",
    ),
    path(
        "documents/<uuid:document_id>/permissions/<int:permission_id>/",
        DocumentPermissionDetailView.as_view(),
        name="document-permission-detail",
    ),
]