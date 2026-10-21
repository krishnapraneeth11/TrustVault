import uuid

from django.conf import settings
from django.db import models


class Document(models.Model):
    class Category(models.TextChoices):
        HR = "HR", "Human Resources"
        FINANCE = "FINANCE", "Finance"
        LEGAL = "LEGAL", "Legal"
        POLICIES = "POLICIES", "Company Policies"
        GENERAL = "GENERAL", "General"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    title = models.CharField(max_length=255)

    file = models.FileField(
        upload_to="documents/%Y/%m/",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_documents",
    )

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL,
    )

    original_filename = models.CharField(max_length=255)

    content_type = models.CharField(max_length=100)

    file_size = models.PositiveBigIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

class DocumentPermission(models.Model):
    class AccessLevel(models.TextChoices):
        READ = "READ", "Read"
        EDIT = "EDIT", "Edit"

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="permissions",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_permissions",
    )

    access_level = models.CharField(
        max_length=10,
        choices=AccessLevel.choices,
        default=AccessLevel.READ,
    )

    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="permissions_granted",
    )

    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document", "user"],
                name="unique_document_user_permission",
            ),
        ]
        ordering = ["-granted_at"]

    def __str__(self):
        return (
            f"{self.user} — {self.access_level} "
            f"on {self.document}"
        )