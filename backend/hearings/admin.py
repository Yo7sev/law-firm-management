from django.contrib import admin

from .models import Hearing


@admin.register(Hearing)
class HearingAdmin(admin.ModelAdmin):
    list_display = (
        "case",
        "hearing_date",
        "hearing_time",
        "court",
        "judge",
        "purpose",
    )

    list_filter = (
        "hearing_date",
        "court",
    )

    search_fields = (
        "case__case_number",
        "case__title",
        "judge",
        "court",
        "purpose",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "case",
    )

    ordering = (
        "hearing_date",
        "hearing_time",
    )