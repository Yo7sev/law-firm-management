from decimal import Decimal

from django.db import transaction

from notifications.models import Notification
from notifications.services import NotificationService

from .models import FinancialTransaction


class FinanceService:
    @staticmethod
    @transaction.atomic
    def create_transaction(
        *,
        client,
        transaction_type,
        amount,
        transaction_date,
        recorded_by,
        case=None,
        description="",
        reference="",
    ):
        amount = Decimal(str(amount))

        if amount <= 0:
            raise ValueError("Transaction amount must be greater than zero.")

        financial_transaction = FinancialTransaction.objects.create(
            client=client,
            case=case,
            transaction_type=transaction_type,
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            reference=reference,
            recorded_by=recorded_by,
        )

        if transaction_type == FinancialTransaction.TransactionType.PAYMENT:
            title = "Payment Recorded"
            message = (
                f"A payment of {amount} JOD has been recorded "
                f"for client {client.full_name}."
            )

            if case:
                message += f" Case: {case.case_number}."

            NotificationService.create(
                user=recorded_by,
                notification_type=Notification.NotificationType.PAYMENT,
                title=title,
                message=message,
                related_case=case,
            )

        return financial_transaction

    @staticmethod
    def calculate_client_balance(client):
        transactions = FinancialTransaction.objects.filter(
            client=client,
        )

        balance = Decimal("0.00")

        for transaction in transactions:
            if transaction.transaction_type == (
                FinancialTransaction.TransactionType.INVOICE
            ):
                balance += transaction.amount

            elif transaction.transaction_type == (
                FinancialTransaction.TransactionType.PAYMENT
            ):
                balance -= transaction.amount

            elif transaction.transaction_type == (
                FinancialTransaction.TransactionType.REFUND
            ):
                balance += transaction.amount

            elif transaction.transaction_type == (
                FinancialTransaction.TransactionType.EXPENSE
            ):
                balance += transaction.amount

        return balance