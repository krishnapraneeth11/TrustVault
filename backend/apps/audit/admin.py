from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "actor_username",
        "action",
        "outcome",
        "document_id",
    )

    list_filter = (
        "action",
        "outcome",
        "created_at",
    )

    search_fields = (
        "actor_username",
        "document_id",
        "action",
    )

    readonly_fields = (
        "id",
        "actor",
        "actor_username",
        "action",
        "outcome",
        "document_id",
        "details",
        "ip_address",
        "created_at",
    )

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_staff

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False