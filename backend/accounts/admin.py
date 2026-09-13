from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib import messages

from .models import User


@admin.action(description="Approve selected users")
def approve_users(modeladmin, request, queryset):
    updated = queryset.update(
        approval_status=User.ApprovalStatus.APPROVED,
        is_active=True,
    )

    modeladmin.message_user(
        request,
        f"{updated} user(s) approved successfully.",
        messages.SUCCESS,
    )


@admin.action(description="Reject selected users")
def reject_users(modeladmin, request, queryset):
    updated = queryset.update(
        approval_status=User.ApprovalStatus.REJECTED,
    )

    modeladmin.message_user(
        request,
        f"{updated} user(s) rejected successfully.",
        messages.WARNING,
    )


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Law Firm Information",
            {
                "fields": (
                    "role",
                    "approval_status",
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Law Firm Information",
            {
                "fields": (
                    "email",
                    "role",
                    "approval_status",
                )
            },
        ),
    )

    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "approval_status",
        "is_active",
        "is_staff",
    )

    list_filter = (
        "role",
        "approval_status",
        "is_active",
        "is_staff",
    )

    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
    )

    actions = (
        approve_users,
        reject_users,
    )
