from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "national_id",
        "client_type",
        "phone",
        "alternative_phone",
        "email",
        "created_by",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "client_type",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "full_name",
        "national_id",
        "phone",
        "alternative_phone",
        "email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "created_by",
    )

    ordering = (
        "-created_at",
    )