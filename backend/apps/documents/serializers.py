from pathlib import Path

from rest_framework import serializers

from .models import Document, DocumentPermission


MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".xlsx",
    ".txt",
}

ALLOWED_CONTENT_TYPES = {
    ".pdf": {"application/pdf"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    },
    ".txt": {"text/plain"},
}


class DocumentUploadSerializer(serializers.ModelSerializer):
    upload = serializers.FileField(write_only=True)

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "category",
            "upload",
            "original_filename",
            "content_type",
            "file_size",
            "created_at",
        )
        read_only_fields = (
            "id",
            "original_filename",
            "content_type",
            "file_size",
            "created_at",
        )

    def validate_upload(self, uploaded_file):
        filename = Path(uploaded_file.name).name
        extension = Path(filename).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "Unsupported file extension. Upload PDF, DOCX, XLSX, or TXT."
            )

        if uploaded_file.size > MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(
                "The maximum upload size is 10 MB."
            )

        content_type = getattr(uploaded_file, "content_type", None)

        if content_type not in ALLOWED_CONTENT_TYPES[extension]:
            raise serializers.ValidationError(
                "The uploaded file's declared content type does not match "
                "the permitted type for its extension."
            )

        if uploaded_file.size == 0:
            raise serializers.ValidationError(
                "Empty files are not allowed."
            )

        return uploaded_file

    def create(self, validated_data):
        uploaded_file = validated_data.pop("upload")

        document = Document(
            **validated_data,
            owner=self.context["request"].user,
            original_filename=Path(uploaded_file.name).name[:255],
            content_type=uploaded_file.content_type or "application/octet-stream",
            file_size=uploaded_file.size,
        )

        document.file.save(
            Path(uploaded_file.name).name,
            uploaded_file,
            save=False,
        )

        document.save()
        return document


class DocumentDetailSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(
        source="owner.username",
        read_only=True,
    )

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "category",
            "owner_username",
            "original_filename",
            "content_type",
            "file_size",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "owner_username",
            "original_filename",
            "content_type",
            "file_size",
            "created_at",
            "updated_at",
        )


class DocumentPermissionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = DocumentPermission
        fields = (
            "id",
            "user",
            "username",
            "access_level",
            "granted_at",
        )
        read_only_fields = (
            "id",
            "username",
            "granted_at",
        )

    def validate_access_level(self, value):
        if value not in DocumentPermission.AccessLevel.values:
            raise serializers.ValidationError(
                "Access level must be READ or EDIT."
            )
        return value

    def validate_user(self, value):
        document = self.context.get("document")

        if document and value.pk == document.owner_id:
            raise serializers.ValidationError(
                "The document owner already has access."
            )

        return value