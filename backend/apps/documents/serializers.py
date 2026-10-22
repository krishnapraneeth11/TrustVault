from pathlib import Path
from zipfile import BadZipFile, ZipFile

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
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    ".txt": {"text/plain"},
}


def validate_file_content(uploaded_file, extension):
    """
    Perform basic file-format checks using the file's actual contents.

    These checks help detect files with misleading extensions, but they
    are not malware scanning or complete security validation.
    """
    try:
        uploaded_file.seek(0)

        if extension == ".pdf":
            signature = uploaded_file.read(5)

            if signature != b"%PDF-":
                raise serializers.ValidationError(
                    "The file contents do not appear to be a valid PDF."
                )

        elif extension in {".docx", ".xlsx"}:
            try:
                with ZipFile(uploaded_file) as archive:
                    entries = set(archive.namelist())

                    if "[Content_Types].xml" not in entries:
                        raise serializers.ValidationError(
                            "The Office document is missing required "
                            "format metadata."
                        )

                    if extension == ".docx":
                        required_entry = "word/document.xml"
                        error_message = (
                            "The file does not contain the expected "
                            "Word document structure."
                        )
                    else:
                        required_entry = "xl/workbook.xml"
                        error_message = (
                            "The file does not contain the expected "
                            "Excel workbook structure."
                        )

                    if required_entry not in entries:
                        raise serializers.ValidationError(error_message)

                    # Check that the archive's entries can be read.
                    bad_entry = archive.testzip()

                    if bad_entry is not None:
                        raise serializers.ValidationError(
                            "The Office document archive is corrupted."
                        )

            except BadZipFile:
                raise serializers.ValidationError(
                    "The file is not a valid Office document archive."
                )

        elif extension == ".txt":
            uploaded_file.seek(0)
            content = uploaded_file.read()

            try:
                text_content = content.decode("utf-8-sig")
            except UnicodeDecodeError:
                raise serializers.ValidationError(
                    "Text files must contain valid UTF-8 text."
                )

            if any(
                ord(character) < 32 and character not in "\t\n\r"
                for character in text_content
            ):
                raise serializers.ValidationError(
                    "The text file contains unsupported control characters."
                )

    finally:
        uploaded_file.seek(0)


class DocumentUploadSerializer(serializers.ModelSerializer):
    upload = serializers.FileField(write_only=True)
    owner_username = serializers.CharField(
        source="owner.username",
        read_only=True,
    )
    current_user_access = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "category",
            "upload",
            "original_filename",
            "owner_username",
            "content_type",
            "file_size",
            "created_at",
            "current_user_access",
        )
        read_only_fields = (
            "id",
            "original_filename",
            "owner_username",
            "content_type",
            "file_size",
            "created_at",
            "current_user_access",
        )

    def get_current_user_access(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        user = request.user

        if obj.owner_id == user.pk:
            return "OWNER"

        permission = (
            DocumentPermission.objects.filter(
                document=obj,
                user=user,
            )
            .values_list("access_level", flat=True)
            .first()
        )

        return permission

    def validate_upload(self, uploaded_file):
        filename = Path(uploaded_file.name).name
        extension = Path(filename).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "Unsupported file extension. Upload PDF, DOCX, XLSX, or TXT."
            )

        if uploaded_file.size == 0:
            raise serializers.ValidationError("Empty files are not allowed.")

        if uploaded_file.size > MAX_UPLOAD_SIZE:
            raise serializers.ValidationError("The maximum upload size is 10 MB.")

        content_type = getattr(uploaded_file, "content_type", None)

        if content_type not in ALLOWED_CONTENT_TYPES[extension]:
            raise serializers.ValidationError(
                "The uploaded file's declared content type does not match "
                "the permitted type for its extension."
            )

        validate_file_content(uploaded_file, extension)

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
    current_user_access = serializers.SerializerMethodField()

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
            "current_user_access",
        )
        read_only_fields = (
            "id",
            "owner_username",
            "original_filename",
            "content_type",
            "file_size",
            "created_at",
            "updated_at",
            "current_user_access",
        )

    def get_current_user_access(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        user = request.user

        if obj.owner_id == user.pk:
            return "OWNER"

        permission = (
            DocumentPermission.objects.filter(
                document=obj,
                user=user,
            )
            .values_list("access_level", flat=True)
            .first()
        )

        return permission


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
            raise serializers.ValidationError("Access level must be READ or EDIT.")
        return value

    def validate_user(self, value):
        document = self.context.get("document")

        if document and value.pk == document.owner_id:
            raise serializers.ValidationError("The document owner already has access.")

        return value
