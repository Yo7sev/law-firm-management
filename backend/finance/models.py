from django.conf import settings
from django.db import models


class FinancialTransaction(models.Model):
    class TransactionType(models.TextChoices):
        INVOICE = "invoice", "Invoice"
        PAYMENT = "payment", "Payment"
        EXPENSE = "expense", "Expense"
        REFUND = "refund", "Refund"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="financial_transactions",
    )

    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="financial_transactions",
        null=True,
        blank=True,
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    transaction_date = models.DateField()

    description = models.TextField(
        blank=True,
    )

    reference = models.CharField(
        max_length=100,
        blank=True,
    )

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_financial_transactions",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-transaction_date", "-created_at"]

        indexes = [
            models.Index(fields=["client"]),
            models.Index(fields=["case"]),
            models.Index(fields=["transaction_type"]),
            models.Index(fields=["transaction_date"]),
        ]

    def __str__(self):
        return (
            f"{self.client.full_name} - "
            f"{self.transaction_type} - "
            f"{self.amount}"
        )