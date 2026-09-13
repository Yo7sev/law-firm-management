from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "client",
        "case",
        "document_type",
        "uploaded_by",
        "created_at",
    )

    list_filter = (
        "document_type",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "client__full_name",
        "client__national_id",
        "case__case_number",
        "case__title",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "client",
        "case",
        "uploaded_by",
    )

    ordering = (
        "-created_at",
    )