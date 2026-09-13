from django.contrib import admin

from .models import StaffProfile


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = (
        "employee_id",
        "user",
        "job_title",
        "phone",
        "hire_date",
        "employment_status",
    )

    list_filter = (
        "employment_status",
        "job_title",
        "hire_date",
    )

    search_fields = (
        "employee_id",
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "job_title",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "user",
    )

    ordering = ("employee_id",)