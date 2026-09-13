from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "case",
        "assigned_to",
        "deadline",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "deadline",
    )

    search_fields = (
        "title",
        "description",
        "case__case_number",
        "case__title",
        "assigned_to__username",
        "assigned_to__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "case",
        "assigned_to",
    )

    ordering = (
        "status",
        "deadline",
    )