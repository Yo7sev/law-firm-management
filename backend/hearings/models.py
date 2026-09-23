from django.db import models


class Hearing(models.Model):
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="hearings",
    )

    hearing_date = models.DateField()

    hearing_time = models.TimeField(
        null=True,
        blank=True,
    )

    court = models.CharField(
        max_length=255,
        blank=True,
    )

    judge = models.CharField(
        max_length=255,
        blank=True,
    )

    purpose = models.CharField(
        max_length=255,
    )

    result = models.TextField(
        blank=True,
    )

    next_action = models.TextField(
        blank=True,
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
        ordering = ["hearing_date", "hearing_time"]

        indexes = [
            models.Index(fields=["hearing_date"]),
            models.Index(fields=["case"]),
        ]

    def __str__(self):
        return f"{self.case.case_number} - {self.hearing_date}"