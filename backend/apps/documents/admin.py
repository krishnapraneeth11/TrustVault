from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "category",
        "file_size",
        "created_at",
    )

    list_filter = ("category", "created_at")

    search_fields = (
        "title",
        "original_filename",
        "owner__username",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )