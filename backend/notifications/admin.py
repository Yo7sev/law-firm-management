from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "notification_type",
        "title",
        "is_read",
        "created_at",
        "read_at",
    )

    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
    )

    search_fields = (
        "user__username",
        "user__email",
        "title",
        "message",
        "related_case__case_number",
        "related_case__title",
    )

    readonly_fields = (
        "created_at",
        "read_at",
    )

    autocomplete_fields = (
        "user",
        "related_case",
        "related_hearing",
        "related_task",
        "related_document",
    )

    ordering = (
        "-created_at",
    )