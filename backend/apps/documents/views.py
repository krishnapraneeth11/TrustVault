from django.http import FileResponse
from django.shortcuts import get_object_or_404
from apps.audit.models import AuditEvent
from apps.audit.services import record_audit_event
from rest_framework.renderers import BaseRenderer
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, OpenApiResponse

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from .models import Document, DocumentPermission
from .serializers import (
    DocumentUploadSerializer,
    DocumentDetailSerializer,
    DocumentPermissionSerializer,
)


def audit_denied(request, action, document_id="", details=None):
    record_audit_event(
        request=request,
        action=action,
        outcome=AuditEvent.Outcome.DENIED,
        document_id=document_id,
        details=details or {},
    )


def is_admin(user):
    return getattr(user, "role", None) == "ADMIN" or user.is_staff


def get_document_access(document, user):
    """Return the user's access level for a document."""
    if document.owner_id == user.id:
        return "OWNER"

    permission = (
        DocumentPermission.objects.filter(
            document=document,
            user=user,
        )
        .only("access_level")
        .first()
    )

    if permission:
        return permission.access_level

    return None


def get_authorized_document(request, document_id, required_access="READ"):
    """Find a document only if the user has sufficient access."""

    document = get_object_or_404(
        Document.objects.select_related("owner"),
        pk=document_id,
    )

    access = get_document_access(document, request.user)

    # Administrators do not automatically get access to document contents.
    if access is None:
        audit_denied(
            request,
            "DOCUMENT_ACCESS",
            document_id=document.pk,
            details={"required_access": required_access},
        )
        raise PermissionDenied("You do not have permission to access this document.")

    # Users with READ access cannot edit document metadata.
    if required_access == "EDIT" and access not in {"OWNER", "EDIT"}:
        audit_denied(
            request,
            "DOCUMENT_EDIT",
            document_id=document.pk,
            details={"required_access": required_access},
        )
        raise PermissionDenied("You need edit permission to perform this action.")

    return document, access


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user

        from django.db.models import Q

        return (
            Document.objects.filter(Q(owner=user) | Q(permissions__user=user))
            .select_related("owner")
            .distinct()
        )

    def perform_create(self, serializer):
        user = self.request.user

        # Only owners and administrators can upload documents.
        if getattr(user, "role", None) not in {"OWNER", "ADMIN"} and not user.is_staff:
            audit_denied(
                self.request,
                "DOCUMENT_UPLOAD",
                details={
                    "reason": "insufficient_role",
                    "user_role": getattr(user, "role", None),
                },
            )
            raise PermissionDenied(
                "Only document owners and administrators can upload documents."
            )

        document = serializer.save()


class DocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["documents"],
        summary="Get document details",
        responses={
            200: DocumentDetailSerializer,
            403: OpenApiResponse(description="Document access denied."),
            404: OpenApiResponse(description="Document not found."),
        },
    )
    def get(self, request, document_id):
        document, _ = get_authorized_document(
            request,
            document_id,
            "READ",
        )

        serializer = DocumentDetailSerializer(document)

        record_audit_event(
            request=request,
            action="DOCUMENT_READ",
            outcome=AuditEvent.Outcome.SUCCESS,
            document_id=document.pk,
        )

        return Response(serializer.data)

    @extend_schema(
        tags=["documents"],
        summary="Update document metadata",
        request=DocumentDetailSerializer,
        responses={
            200: DocumentDetailSerializer,
            403: OpenApiResponse(description="Edit permission required."),
            404: OpenApiResponse(description="Document not found."),
        },
    )
    def patch(self, request, document_id):
        with transaction.atomic():
            document, _ = get_authorized_document(
                request,
                document_id,
                "EDIT",
            )

            serializer = DocumentDetailSerializer(
                document,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            record_audit_event(
                request=request,
                action="DOCUMENT_UPDATE",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=document.pk,
                details={
                    "updated_fields": sorted(serializer.validated_data.keys()),
                },
            )

            return Response(serializer.data)

    @extend_schema(
        tags=["documents"],
        summary="Delete document",
        responses={
            204: OpenApiResponse(description="Document deleted."),
            403: OpenApiResponse(description="Only the owner can delete the document."),
            404: OpenApiResponse(description="Document not found."),
        },
    )
    def delete(self, request, document_id):
        document, access = get_authorized_document(
            request,
            document_id,
            "READ",
        )

        # Deletion is reserved for the document owner.
        if access != "OWNER":
            audit_denied(
                request,
                "DOCUMENT_DELETE",
                document_id=document.pk,
            )
            raise PermissionDenied("Only the document owner can delete this document.")

        document_id_for_audit = str(document.pk)
        original_filename = document.original_filename

        if document.file:
            document.file.delete(save=False)

        document.delete()

        record_audit_event(
            request=request,
            action="DOCUMENT_DELETE",
            outcome=AuditEvent.Outcome.SUCCESS,
            document_id=document_id_for_audit,
            details={
                "filename": original_filename,
            },
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class DownloadRenderer(BaseRenderer):
    media_type = "*/*"
    format = "binary"
    render_style = "binary"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class DocumentDownloadView(APIView):
    renderer_classes = [DownloadRenderer]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["documents"],
        summary="Download document",
        responses={
            (200, "application/octet-stream"): OpenApiResponse(
                description="Returns the document as a downloadable binary file."
            ),
            403: OpenApiResponse(description="Document access denied."),
            404: OpenApiResponse(description="Document or stored file not found."),
        },
    )
    def get(self, request, document_id):
        document, _ = get_authorized_document(
            request,
            document_id,
            "READ",
        )

        if not document.file:
            record_audit_event(
                request=request,
                action="DOCUMENT_DOWNLOAD",
                outcome=AuditEvent.Outcome.FAILURE,
                document_id=document.pk,
                details={
                    "reason": "missing_file_reference",
                },
            )
            return Response(
                {"detail": "This document has no stored file."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            file_handle = document.file.open("rb")
        except (FileNotFoundError, OSError):
            record_audit_event(
                request=request,
                action="DOCUMENT_DOWNLOAD",
                outcome=AuditEvent.Outcome.FAILURE,
                document_id=document.pk,
                details={
                    "reason": "stored_file_unavailable",
                },
            )
            return Response(
                {"detail": "The stored file could not be found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = FileResponse(
            file_handle,
            as_attachment=True,
            filename=document.original_filename,
            content_type="application/octet-stream",
        )
        response["X-Content-Type-Options"] = "nosniff"

        record_audit_event(
            request=request,
            action="DOCUMENT_DOWNLOAD",
            outcome=AuditEvent.Outcome.SUCCESS,
            document_id=document.pk,
            details={
                "filename": document.original_filename,
                "file_size": document.file_size,
            },
        )

        return response


class DocumentPermissionListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["permissions"],
        summary="List document permissions",
        responses={
            200: DocumentPermissionSerializer(many=True),
            403: OpenApiResponse(description="Permission management access denied."),
            404: OpenApiResponse(description="Document not found."),
        },
    )
    def get(self, request, document_id):
        document = get_object_or_404(Document, pk=document_id)

        if document.owner_id != request.user.id and not is_admin(request.user):
            audit_denied(
                request,
                "PERMISSION_LIST",
                document_id=document.pk,
            )
            raise PermissionDenied(
                "Only the document owner or an administrator can manage permissions."
            )

        permissions_qs = DocumentPermission.objects.filter(
            document=document
        ).select_related("user")

        serializer = DocumentPermissionSerializer(
            permissions_qs,
            many=True,
        )
        return Response(serializer.data)

    @extend_schema(
        tags=["permissions"],
        summary="Grant or update document permission",
        request={
            "application/json": {
                "type": "object",
                "required": ["username", "access_level"],
                "properties": {
                    "username": {"type": "string"},
                    "access_level": {
                        "type": "string",
                        "enum": ["READ", "EDIT"],
                    },
                },
            }
        },
        responses={
            200: DocumentPermissionSerializer,
            201: DocumentPermissionSerializer,
            400: OpenApiResponse(description="Invalid username or access level."),
            403: OpenApiResponse(description="Permission management access denied."),
            404: OpenApiResponse(description="Document not found."),
        },
    )
    def post(self, request, document_id):
        document = get_object_or_404(Document, pk=document_id)

        # Only the document owner or an administrator may grant access.
        if document.owner_id != request.user.id and not is_admin(request.user):
            audit_denied(
                request,
                "PERMISSION_GRANT",
                document_id=document.pk,
            )
            raise PermissionDenied(
                "Only the document owner or an administrator can manage permissions."
            )

        username = request.data.get("username")
        access_level = request.data.get("access_level")

        # Validate the submitted username.
        if not isinstance(username, str) or not username.strip():
            return Response(
                {"username": ["Enter a valid username."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = username.strip()

        # Validate the requested access level.
        if access_level not in DocumentPermission.AccessLevel.values:
            return Response(
                {"access_level": ["Access level must be READ or EDIT."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        target_user = User.objects.filter(username=username).first()

        if target_user is None:
            return Response(
                {"username": ["No existing user was found with that username."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user.pk == document.owner_id:
            return Response(
                {"username": ["The document owner already has access."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            permission_record, created = DocumentPermission.objects.update_or_create(
                document=document,
                user=target_user,
                defaults={
                    "access_level": access_level,
                    "granted_by": request.user,
                },
            )

            output = DocumentPermissionSerializer(permission_record)

            record_audit_event(
                request=request,
                action="PERMISSION_GRANT",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=document.pk,
                details={
                    "target_user_id": permission_record.user_id,
                    "access_level": permission_record.access_level,
                    "created": created,
                },
            )

            return Response(
                output.data,
                status=(status.HTTP_201_CREATED if created else status.HTTP_200_OK),
            )


class DocumentPermissionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["permissions"],
        summary="Revoke document permission",
        responses={
            204: OpenApiResponse(description="Permission revoked."),
            403: OpenApiResponse(description="Permission management access denied."),
            404: OpenApiResponse(description="Document or permission not found."),
        },
    )
    def delete(self, request, document_id, permission_id):
        document = get_object_or_404(
            Document,
            pk=document_id,
        )

        # Record denied attempts outside the transaction that may roll back.
        if document.owner_id != request.user.id and not is_admin(request.user):
            audit_denied(
                request,
                "PERMISSION_REVOKE",
                document_id=document.pk,
            )
            raise PermissionDenied(
                "Only the document owner or an administrator " "can revoke permissions."
            )

        with transaction.atomic():
            permission_record = get_object_or_404(
                DocumentPermission,
                pk=permission_id,
                document=document,
            )

            revoked_user_id = permission_record.user_id
            revoked_access_level = permission_record.access_level

            permission_record.delete()

            record_audit_event(
                request=request,
                action="PERMISSION_REVOKE",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=document.pk,
                details={
                    "target_user_id": revoked_user_id,
                    "previous_access_level": revoked_access_level,
                },
            )

            return Response(status=status.HTTP_204_NO_CONTENT)
