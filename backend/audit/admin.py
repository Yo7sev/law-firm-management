from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "action",
        "model_name",
        "object_id",
        "created_at",
    )

    list_filter = (
        "action",
        "model_name",
        "created_at",
    )

    search_fields = (
        "user__username",
        "user__email",
        "model_name",
        "object_id",
        "description",
        "ip_address",
    )

    readonly_fields = (
        "created_at",
    )

    autocomplete_fields = (
        "user",
    )

    ordering = (
        "-created_at",
    )

    def save_model(self, request, obj, form, change):
        if not obj.user_id:
            obj.user = request.user

        super().save_model(request, obj, form, change)