from django.contrib import admin

from .models import Case, CaseType


@admin.register(CaseType)
class CaseTypeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "is_active",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "description",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "name",
    )


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        "case_number",
        "title",
        "client",
        "case_type",
        "status",
        "priority",
        "court",
        "judge",
        "opposing_party",
        "assigned_lawyer",
        "opening_date",
        "closing_date",
    )

    list_filter = (
        "status",
        "priority",
        "case_type",
        "court",
        "opening_date",
    )

    search_fields = (
        "case_number",
        "title",
        "client__full_name",
        "client__national_id",
        "court",
        "judge",
        "opposing_party",
        "opposing_lawyer",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "client",
        "assigned_lawyer",
    )

    ordering = (
        "-created_at",
    )