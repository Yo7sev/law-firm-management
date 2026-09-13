from django.contrib import admin

from .models import FinancialTransaction


@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "client",
        "case",
        "transaction_type",
        "amount",
        "transaction_date",
        "reference",
        "recorded_by",
        "created_at",
    )

    list_filter = (
        "transaction_type",
        "transaction_date",
    )

    search_fields = (
        "client__full_name",
        "client__national_id",
        "case__case_number",
        "reference",
        "description",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "client",
        "case",
        "recorded_by",
    )

    ordering = (
        "-transaction_date",
        "-created_at",
    )