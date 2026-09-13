from django.conf import settings
from django.db import models


class Client(models.Model):
    class ClientType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        COMPANY = "company", "Company"

    full_name = models.CharField(
        max_length=255,
    )

    national_id = models.CharField(
        max_length=20,
        unique=True,
    )

    phone = models.CharField(
        max_length=30,
    )

    alternative_phone = models.CharField(
        max_length=30,
        blank=True,
    )

    client_type = models.CharField(
        max_length=20,
        choices=ClientType.choices,
        default=ClientType.INDIVIDUAL,
    )

    email = models.EmailField(
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_clients",
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
            models.Index(fields=["full_name"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["national_id"]),
        ]

    def __str__(self):
        return self.full_name