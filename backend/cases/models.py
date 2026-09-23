from django.conf import settings
from django.db import models


class CaseType(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Case(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending"
        CLOSED = "closed", "Closed"
        ARCHIVED = "archived", "Archived"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="cases",
    )

    case_number = models.CharField(
        max_length=50,
        unique=True,
    )

    title = models.CharField(
        max_length=255,
    )

    case_type = models.ForeignKey(
        CaseType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="cases",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    court = models.CharField(
        max_length=255,
        blank=True,
    )

    court_number = models.CharField(
        max_length=100,
        blank=True,
    )

    judge = models.CharField(
        max_length=255,
        blank=True,
    )

    opposing_party = models.CharField(
        max_length=255,
        blank=True,
    )

    opposing_lawyer = models.CharField(
        max_length=255,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    opening_date = models.DateField()

    closing_date = models.DateField(
        null=True,
        blank=True,
    )

    assigned_lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_cases",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["case_number"]),
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["opening_date"]),
            models.Index(fields=["client"]),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.title}"