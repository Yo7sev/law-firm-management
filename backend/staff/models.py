from django.conf import settings
from django.db import models


class StaffProfile(models.Model):
    class EmploymentStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        ON_LEAVE = "on_leave", "On Leave"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="staff_profile",
    )

    employee_id = models.CharField(
        max_length=50,
        unique=True,
    )

    job_title = models.CharField(
        max_length=100,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    hire_date = models.DateField(
        null=True,
        blank=True,
    )

    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["employee_id"]
        indexes = [
            models.Index(fields=["employee_id"]),
            models.Index(fields=["employment_status"]),
            models.Index(fields=["job_title"]),
        ]

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name() or self.user.email}"