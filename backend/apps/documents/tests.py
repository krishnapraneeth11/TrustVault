import tempfile

from django.contrib.auth import get_user_model

from django.test import override_settings
from apps.audit.models import AuditEvent
from django.core.files.uploadedfile import SimpleUploadedFile

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Document, DocumentPermission

User = get_user_model()


class DocumentUploadTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="document_owner",
            email="owner@example.com",
            password="Strong-Test-Pass-482!",
            role=User.Role.OWNER,
        )

        self.other_user = User.objects.create_user(
            username="other_employee",
            email="other@example.com",
            password="Strong-Test-Pass-593!",
        )

        self.upload_url = "/api/documents/"

    def make_text_file(self, name="policy.txt", content=b"Sample policy text"):
        return SimpleUploadedFile(
            name,
            content,
            content_type="text/plain",
        )

    def test_unauthenticated_user_cannot_list_or_upload(self):
        response = self.client.get(self.upload_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(
            self.upload_url,
            {"title": "Policy", "upload": self.make_text_file()},
            format="multipart",
        )
        self.assertIn(
            response.status_code,
            (
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ),
        )

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp(prefix="trustvault-test-media-"))
    def test_authenticated_user_can_upload_text_file(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.upload_url,
            {
                "title": "Security Policy",
                "category": "POLICIES",
                "upload": self.make_text_file(),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Document.objects.count(), 1)

        document = Document.objects.get()
        self.assertEqual(document.owner, self.owner)
        self.assertEqual(document.title, "Security Policy")
        self.assertEqual(document.original_filename, "policy.txt")
        self.assertEqual(document.file_size, len(b"Sample policy text"))

    @override_settings(
        MEDIA_ROOT=tempfile.mkdtemp(prefix="trustvault-audit-test-media-")
    )
    def test_successful_upload_creates_audit_event(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.upload_url,
            {
                "title": "Audited Security Policy",
                "category": "POLICIES",
                "upload": self.make_text_file(
                    name="audited-policy.txt",
                    content=b"Audited policy content",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        document = Document.objects.get(title="Audited Security Policy")

        audit_events = AuditEvent.objects.filter(
            actor=self.owner,
            action="DOCUMENT_UPLOAD",
            outcome=AuditEvent.Outcome.SUCCESS,
            document_id=str(document.pk),
        )

        self.assertEqual(
            audit_events.count(),
            1,
            "A successful document upload should create exactly one success audit event.",
        )

        event = audit_events.get()

        self.assertEqual(
            event.details.get("filename"),
            "audited-policy.txt",
        )
        self.assertEqual(
            event.details.get("file_size"),
            len(b"Audited policy content"),
        )

    def test_unsupported_extension_is_rejected(self):
        self.client.force_authenticate(user=self.owner)

        upload = SimpleUploadedFile(
            "program.exe",
            b"not a permitted document",
            content_type="application/octet-stream",
        )

        response = self.client.post(
            self.upload_url,
            {"title": "Unexpected file", "upload": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Document.objects.count(), 0)

    def test_user_cannot_list_another_users_documents(self):
        Document.objects.create(
            title="Private Policy",
            file="documents/private/policy.txt",
            owner=self.owner,
            category="POLICIES",
            original_filename="policy.txt",
            content_type="text/plain",
            file_size=12,
        )

        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(self.upload_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_viewer_upload_is_denied_and_audited(self):
        viewer = User.objects.create_user(
            username="upload_viewer",
            email="upload_viewer@example.com",
            password="Strong-Test-Pass-593!",
            role=User.Role.VIEWER,
        )

        self.client.force_authenticate(user=viewer)

        response = self.client.post(
            self.upload_url,
            {
                "title": "Unauthorized Policy",
                "category": "POLICIES",
                "upload": self.make_text_file(),
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(Document.objects.count(), 0)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=viewer,
                action="DOCUMENT_UPLOAD",
                outcome=AuditEvent.Outcome.DENIED,
            ).exists()
        )


class DocumentPermissionSecurityTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="permission_owner",
            email="permission-owner@example.com",
            password="Strong-Test-Pass-482!",
            role=User.Role.OWNER,
        )

        self.viewer = User.objects.create_user(
            username="permission_viewer",
            email="permission-viewer@example.com",
            password="Strong-Test-Pass-593!",
            role=User.Role.VIEWER,
        )

        self.other_owner = User.objects.create_user(
            username="unrelated_owner",
            email="unrelated-owner@example.com",
            password="Strong-Test-Pass-694!",
            role=User.Role.OWNER,
        )

        self.document = Document.objects.create(
            title="Confidential Policy",
            file="documents/test/confidential.txt",
            owner=self.owner,
            category="POLICIES",
            original_filename="confidential.txt",
            content_type="text/plain",
            file_size=20,
        )

        self.detail_url = f"/api/documents/{self.document.id}/"
        self.download_url = f"/api/documents/{self.document.id}/download/"
        self.permissions_url = f"/api/documents/{self.document.id}/permissions/"

    def test_unrelated_user_cannot_view_document_details(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(self.detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_owner_can_grant_read_permission(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.permissions_url,
            {
                "username": self.viewer.username,
                "access_level": "READ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            DocumentPermission.objects.filter(
                document=self.document,
                user=self.viewer,
                access_level="READ",
            ).exists()
        )

    def test_viewer_can_view_document_after_read_grant(self):
        DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_viewer_cannot_download_without_permission(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(self.download_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_viewer_cannot_grant_themselves_permission(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.post(
            self.permissions_url,
            {
                "user": self.viewer.pk,
                "access_level": "READ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unrelated_owner_cannot_grant_permissions(self):
        self.client.force_authenticate(user=self.other_owner)

        response = self.client.post(
            self.permissions_url,
            {
                "user": self.viewer.pk,
                "access_level": "READ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_revoked_permission_immediately_blocks_document_access(self):
        permission_record = DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.viewer)

        allowed_response = self.client.get(self.detail_url)

        self.assertEqual(
            allowed_response.status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(user=self.owner)

        revoke_response = self.client.delete(
            f"{self.permissions_url}{permission_record.pk}/"
        )

        self.assertEqual(
            revoke_response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.client.force_authenticate(user=self.viewer)

        denied_response = self.client.get(self.detail_url)

        self.assertEqual(
            denied_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_read_permission_cannot_edit_document_metadata(self):
        DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.viewer)

        response = self.client.patch(
            self.detail_url,
            {"title": "Changed by Viewer"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.document.refresh_from_db()
        self.assertEqual(
            self.document.title,
            "Confidential Policy",
        )

    def test_edit_permission_allows_metadata_change(self):
        DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.EDIT,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.viewer)

        response = self.client.patch(
            self.detail_url,
            {"title": "Updated Policy"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.document.refresh_from_db()
        self.assertEqual(
            self.document.title,
            "Updated Policy",
        )

    def test_edit_permission_cannot_change_document_owner(self):
        DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.EDIT,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.viewer)

        response = self.client.patch(
            self.detail_url,
            {"owner": self.viewer.pk},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.document.refresh_from_db()
        self.assertEqual(
            self.document.owner,
            self.owner,
        )

    def test_revoked_permission_immediately_blocks_download(self):
        permission_record = DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        # Confirm the viewer initially has access.
        self.client.force_authenticate(user=self.viewer)
        initial_response = self.client.get(self.download_url)

        # The test document has no real file, so a 404 is expected
        # after authorization succeeds. We test revocation below.
        self.assertEqual(
            initial_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # The owner revokes the viewer's permission.
        self.client.force_authenticate(user=self.owner)
        revoke_response = self.client.delete(
            f"{self.permissions_url}{permission_record.pk}/"
        )

        self.assertEqual(
            revoke_response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        # The viewer must now be denied before file access.
        self.client.force_authenticate(user=self.viewer)
        denied_response = self.client.get(self.download_url)

        self.assertEqual(
            denied_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


class DocumentAuditTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="audit_owner",
            email="audit_owner@example.com",
            password="TestPassword123!",
            role=User.Role.OWNER,
        )

        self.viewer = User.objects.create_user(
            username="audit_viewer",
            email="audit_viewer@example.com",
            password="TestPassword123!",
            role=User.Role.VIEWER,
        )

        self.document = Document.objects.create(
            title="Audit Test Document",
            owner=self.owner,
            category=Document.Category.GENERAL,
            original_filename="audit-test.txt",
            content_type="text/plain",
            file_size=12,
            file="documents/test/audit-test.txt",
        )

        self.detail_url = f"/api/documents/{self.document.pk}/"
        self.download_url = f"/api/documents/{self.document.pk}/download/"

    def test_authorized_document_read_creates_audit_event(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, 200)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.owner,
                action="DOCUMENT_READ",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_unauthorized_document_read_creates_denied_event(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.viewer,
                action="DOCUMENT_ACCESS",
                outcome=AuditEvent.Outcome.DENIED,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_permission_grant_creates_audit_event(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            f"/api/documents/{self.document.pk}/permissions/",
            {
                "username": self.viewer.username,
                "access_level": "READ",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.owner,
                action="PERMISSION_GRANT",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_permission_revoke_creates_audit_event(self):
        permission_record = DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            f"/api/documents/{self.document.pk}/permissions/" f"{permission_record.pk}/"
        )

        self.assertEqual(response.status_code, 204)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.owner,
                action="PERMISSION_REVOKE",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_document_update_creates_audit_event(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.detail_url,
            {"title": "Updated Audit Test Document"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.owner,
                action="DOCUMENT_UPDATE",
                outcome=AuditEvent.Outcome.SUCCESS,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_unauthorized_user_cannot_view_permissions_and_attempt_is_audited(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(f"/api/documents/{self.document.pk}/permissions/")

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.viewer,
                action="PERMISSION_LIST",
                outcome=AuditEvent.Outcome.DENIED,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_unauthorized_user_cannot_grant_permissions_and_attempt_is_audited(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.post(
            f"/api/documents/{self.document.pk}/permissions/",
            {
                "user": self.owner.pk,
                "access_level": "READ",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.viewer,
                action="PERMISSION_GRANT",
                outcome=AuditEvent.Outcome.DENIED,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_unauthorized_user_cannot_revoke_permissions_and_attempt_is_audited(self):
        permission_record = DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        another_user = User.objects.create_user(
            username="audit_another_viewer",
            email="audit_another_viewer@example.com",
            password="TestPassword123!",
            role=User.Role.VIEWER,
        )

        self.client.force_authenticate(user=another_user)

        response = self.client.delete(
            f"/api/documents/{self.document.pk}/permissions/" f"{permission_record.pk}/"
        )

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=another_user,
                action="PERMISSION_REVOKE",
                outcome=AuditEvent.Outcome.DENIED,
                document_id=str(self.document.pk),
            ).exists()
        )

    def test_read_only_user_cannot_delete_document_and_attempt_is_audited(self):
        DocumentPermission.objects.create(
            document=self.document,
            user=self.viewer,
            access_level=DocumentPermission.AccessLevel.READ,
            granted_by=self.owner,
        )

        self.client.force_authenticate(user=self.viewer)

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.viewer,
                action="DOCUMENT_DELETE",
                outcome=AuditEvent.Outcome.DENIED,
                document_id=str(self.document.pk),
            ).exists()
        )

        self.assertTrue(Document.objects.filter(pk=self.document.pk).exists())

    def test_missing_file_download_creates_failure_audit_event(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.download_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.owner,
                action="DOCUMENT_DOWNLOAD",
                outcome=AuditEvent.Outcome.FAILURE,
                document_id=str(self.document.pk),
                details__reason="stored_file_unavailable",
            ).exists()
        )
