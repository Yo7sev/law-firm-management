from django.conf import settings
from django.db import models


class Document(models.Model):
    class DocumentType(models.TextChoices):
        CONTRACT = "contract", "Contract"
        COURT_DOCUMENT = "court_document", "Court Document"
        IDENTIFICATION = "identification", "Identification"
        EVIDENCE = "evidence", "Evidence"
        CORRESPONDENCE = "correspondence", "Correspondence"
        OTHER = "other", "Other"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="documents",
    )

    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.PROTECT,
        related_name="documents",
        null=True,
        blank=True,
    )

    title = models.CharField(
        max_length=255,
    )

    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
    )

    file_path = models.CharField(
        max_length=500,
        blank=True,
    )

    original_filename = models.CharField(
        max_length=255,
        blank=True,
    )

    file_size = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    mime_type = models.CharField(
        max_length=150,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_documents",
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
            models.Index(fields=["client"]),
            models.Index(fields=["case"]),
            models.Index(fields=["document_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title