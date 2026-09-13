from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        HEARING = "hearing", "Hearing"
        TASK = "task", "Task"
        PAYMENT = "payment", "Payment"
        DOCUMENT = "document", "Document"
        CASE = "case", "Case"
        SYSTEM = "system", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
    )

    title = models.CharField(
        max_length=255,
    )

    message = models.TextField()

    is_read = models.BooleanField(
        default=False,
    )

    related_case = models.ForeignKey(
        "cases.Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    related_hearing = models.ForeignKey(
        "hearings.Hearing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    related_task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    related_document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["notification_type"]),
            models.Index(fields=["related_case"]),
            models.Index(fields=["related_hearing"]),
            models.Index(fields=["related_task"]),
            models.Index(fields=["related_document"]),
        ]

    def save(self, *args, **kwargs):
        if self.is_read and self.read_at is None:
            self.read_at = timezone.now()

        elif not self.is_read:
            self.read_at = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.title}"