import json
from datetime import date
from decimal import Decimal, InvalidOperation

from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cases.models import Case
from clients.models import Client

from .models import FinancialTransaction
from .services import FinanceService


def transaction_to_dict(financial_transaction):
    return {
        "id": financial_transaction.id,
        "client_id": financial_transaction.client_id,
        "client": {
            "id": financial_transaction.client.id,
            "full_name": financial_transaction.client.full_name,
        },
        "case_id": financial_transaction.case_id,
        "case": (
            {
                "id": financial_transaction.case.id,
                "case_number": financial_transaction.case.case_number,
                "title": financial_transaction.case.title,
            }
            if financial_transaction.case
            else None
        ),
        "transaction_type": financial_transaction.transaction_type,
        "transaction_type_display": financial_transaction.get_transaction_type_display(),
        "amount": str(financial_transaction.amount),
        "transaction_date": financial_transaction.transaction_date.isoformat(),
        "description": financial_transaction.description,
        "reference": financial_transaction.reference,
        "recorded_by_id": financial_transaction.recorded_by_id,
        "recorded_by": (
            financial_transaction.recorded_by.get_full_name()
            or financial_transaction.recorded_by.username
        ),
        "created_at": financial_transaction.created_at.isoformat(),
        "updated_at": financial_transaction.updated_at.isoformat(),
    }


def parse_request_body(request):
    try:
        body = request.body.decode("utf-8")

        if not body:
            return {}

        return json.loads(body)

    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValueError("Invalid JSON request body.")


def get_transaction_data(data):
    client_id = data.get("client_id")
    case_id = data.get("case_id")
    transaction_type = data.get("transaction_type")
    amount = data.get("amount")
    transaction_date = data.get("transaction_date")
    description = data.get("description", "")
    reference = data.get("reference", "")

    if not client_id:
        raise ValueError("Client is required.")

    if not transaction_type:
        raise ValueError("Transaction type is required.")

    valid_types = {
        choice[0]
        for choice in FinancialTransaction.TransactionType.choices
    }

    if transaction_type not in valid_types:
        raise ValueError("Invalid transaction type.")

    if amount in (None, ""):
        raise ValueError("Amount is required.")

    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, ValueError):
        raise ValueError("Amount must be a valid number.")

    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")

    if not transaction_date:
        raise ValueError("Transaction date is required.")

    try:
        transaction_date = date.fromisoformat(transaction_date)
    except ValueError:
        raise ValueError("Transaction date must be in YYYY-MM-DD format.")

    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        raise ValueError("Client not found.")

    case = None

    if case_id not in (None, "", 0, "0"):
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            raise ValueError("Case not found.")

        if case.client_id != client.id:
            raise ValueError(
                "The selected case does not belong to the selected client."
            )

    return {
        "client": client,
        "case": case,
        "transaction_type": transaction_type,
        "amount": amount,
        "transaction_date": transaction_date,
        "description": str(description or "").strip(),
        "reference": str(reference or "").strip(),
    }


@csrf_exempt
@login_required
@require_http_methods(["GET", "POST"])
def finance_transactions(request):
    if request.method == "GET":
        transactions = (
            FinancialTransaction.objects
            .select_related("client", "case", "recorded_by")
            .all()
        )

        client_id = request.GET.get("client")
        case_id = request.GET.get("case")
        transaction_type = request.GET.get("type")
        search = request.GET.get("search", "").strip()

        if client_id:
            transactions = transactions.filter(client_id=client_id)

        if case_id:
            transactions = transactions.filter(case_id=case_id)

        if transaction_type:
            transactions = transactions.filter(
                transaction_type=transaction_type
            )

        if search:
            transactions = transactions.filter(
                description__icontains=search
            ) | transactions.filter(
                reference__icontains=search
            ) | transactions.filter(
                client__full_name__icontains=search
            )

        transactions = transactions.select_related(
            "client",
            "case",
            "recorded_by",
        )

        transaction_list = [
            transaction_to_dict(item)
            for item in transactions
        ]

        total_invoices = (
            transactions
            .filter(
                transaction_type=FinancialTransaction.TransactionType.INVOICE
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        total_payments = (
            transactions
            .filter(
                transaction_type=FinancialTransaction.TransactionType.PAYMENT
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        total_expenses = (
            transactions
            .filter(
                transaction_type=FinancialTransaction.TransactionType.EXPENSE
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        total_refunds = (
            transactions
            .filter(
                transaction_type=FinancialTransaction.TransactionType.REFUND
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        outstanding_balance = (
            total_invoices
            + total_expenses
            + total_refunds
            - total_payments
        )

        return JsonResponse(
            {
                "success": True,
                "transactions": transaction_list,
                "statistics": {
                    "total_invoices": str(total_invoices),
                    "total_payments": str(total_payments),
                    "total_expenses": str(total_expenses),
                    "total_refunds": str(total_refunds),
                    "outstanding_balance": str(outstanding_balance),
                    "transaction_count": len(transaction_list),
                },
            }
        )

    try:
        data = parse_request_body(request)
        transaction_data = get_transaction_data(data)

        financial_transaction = FinanceService.create_transaction(
            client=transaction_data["client"],
            case=transaction_data["case"],
            transaction_type=transaction_data["transaction_type"],
            amount=transaction_data["amount"],
            transaction_date=transaction_data["transaction_date"],
            description=transaction_data["description"],
            reference=transaction_data["reference"],
            recorded_by=request.user,
        )

        financial_transaction = (
            FinancialTransaction.objects
            .select_related("client", "case", "recorded_by")
            .get(pk=financial_transaction.pk)
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Financial transaction created successfully.",
                "transaction": transaction_to_dict(financial_transaction),
            },
            status=201,
        )

    except ValueError as error:
        return JsonResponse(
            {
                "success": False,
                "message": str(error),
            },
            status=400,
        )

    except Exception as error:
        return JsonResponse(
            {
                "success": False,
                "message": f"Unable to create transaction: {error}",
            },
            status=500,
        )


@csrf_exempt
@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def finance_transaction_detail(request, transaction_id):
    try:
        financial_transaction = (
            FinancialTransaction.objects
            .select_related("client", "case", "recorded_by")
            .get(pk=transaction_id)
        )
    except FinancialTransaction.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Financial transaction not found.",
            },
            status=404,
        )

    if request.method == "GET":
        return JsonResponse(
            {
                "success": True,
                "transaction": transaction_to_dict(financial_transaction),
            }
        )

    if request.method == "DELETE":
        financial_transaction.delete()

        return JsonResponse(
            {
                "success": True,
                "message": "Financial transaction deleted successfully.",
            }
        )

    try:
        data = parse_request_body(request)

        transaction_data = get_transaction_data(data)

        financial_transaction.client = transaction_data["client"]
        financial_transaction.case = transaction_data["case"]
        financial_transaction.transaction_type = (
            transaction_data["transaction_type"]
        )
        financial_transaction.amount = transaction_data["amount"]
        financial_transaction.transaction_date = (
            transaction_data["transaction_date"]
        )
        financial_transaction.description = transaction_data["description"]
        financial_transaction.reference = transaction_data["reference"]

        financial_transaction.save()

        financial_transaction = (
            FinancialTransaction.objects
            .select_related("client", "case", "recorded_by")
            .get(pk=financial_transaction.pk)
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Financial transaction updated successfully.",
                "transaction": transaction_to_dict(financial_transaction),
            }
        )

    except ValueError as error:
        return JsonResponse(
            {
                "success": False,
                "message": str(error),
            },
            status=400,
        )

    except Exception as error:
        return JsonResponse(
            {
                "success": False,
                "message": f"Unable to update transaction: {error}",
            },
            status=500,
        )


@login_required
@require_http_methods(["GET"])
def finance_clients(request):
    clients = Client.objects.all().order_by("full_name")

    return JsonResponse(
        {
            "success": True,
            "clients": [
                {
                    "id": client.id,
                    "full_name": client.full_name,
                }
                for client in clients
            ],
        }
    )


@login_required
@require_http_methods(["GET"])
def finance_cases(request):
    client_id = request.GET.get("client")

    cases = Case.objects.select_related("client").all()

    if client_id:
        cases = cases.filter(client_id=client_id)

    cases = cases.order_by("-created_at")

    return JsonResponse(
        {
            "success": True,
            "cases": [
                {
                    "id": case.id,
                    "case_number": case.case_number,
                    "title": case.title,
                    "client_id": case.client_id,
                    "client_name": case.client.full_name,
                }
                for case in cases
            ],
        }
    )