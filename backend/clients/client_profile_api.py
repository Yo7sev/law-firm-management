from datetime import date

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from cases.models import Case
from documents.models import Document
from finance.models import FinancialTransaction
from hearings.models import Hearing
from tasks.models import Task

from .models import Client


def user_can_access_client(user, client):
    if user.is_superuser or user.role == "super_admin":
        return True

    if user.role == "lawyer":
        return (
            client.created_by_id == user.id
            or client.cases.filter(
                assigned_lawyer_id=user.id,
            ).exists()
        )

    if user.role == "legal_assistant":
        return client.created_by_id == user.id

    return client.created_by_id == user.id


def serialize_date(value):
    if not value:
        return None

    if isinstance(value, date):
        return value.isoformat()

    return str(value)


def serialize_case(case):
    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "case_type": (
            case.case_type.name
            if case.case_type
            else None
        ),
        "status": case.status,
        "status_display": case.get_status_display(),
        "priority": case.priority,
        "priority_display": case.get_priority_display(),
        "court": case.court,
        "court_number": case.court_number,
        "judge": case.judge,
        "opposing_party": case.opposing_party,
        "opposing_lawyer": case.opposing_lawyer,
        "description": case.description,
        "opening_date": serialize_date(
            case.opening_date
        ),
        "closing_date": serialize_date(
            case.closing_date
        ),
        "assigned_lawyer": (
            {
                "id": case.assigned_lawyer.id,
                "name": (
                    case.assigned_lawyer.get_full_name()
                    or case.assigned_lawyer.email
                ),
                "email": case.assigned_lawyer.email,
            }
            if case.assigned_lawyer
            else None
        ),
        "created_at": case.created_at.isoformat(),
        "updated_at": case.updated_at.isoformat(),
    }


def serialize_hearing(hearing):
    return {
        "id": hearing.id,
        "case_id": hearing.case_id,
        "case_number": hearing.case.case_number,
        "case_title": hearing.case.title,
        "hearing_date": serialize_date(
            hearing.hearing_date
        ),
        "hearing_time": (
            hearing.hearing_time.isoformat()
            if hearing.hearing_time
            else None
        ),
        "court": hearing.court,
        "judge": hearing.judge,
        "purpose": hearing.purpose,
        "result": hearing.result,
        "next_action": hearing.next_action,
        "notes": hearing.notes,
        "created_at": hearing.created_at.isoformat(),
        "updated_at": hearing.updated_at.isoformat(),
    }


def serialize_document(document):
    return {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "document_type_display": (
            document.get_document_type_display()
        ),
        "case_id": document.case_id,
        "case_number": (
            document.case.case_number
            if document.case
            else None
        ),
        "original_filename": document.original_filename,
        "file_path": document.file_path,
        "file_size": document.file_size,
        "mime_type": document.mime_type,
        "description": document.description,
        "uploaded_by": (
            document.uploaded_by.get_full_name()
            or document.uploaded_by.email
        ),
        "created_at": document.created_at.isoformat(),
        "updated_at": document.updated_at.isoformat(),
    }


def serialize_task(task):
    return {
        "id": task.id,
        "case_id": task.case_id,
        "case_number": task.case.case_number,
        "case_title": task.case.title,
        "title": task.title,
        "description": task.description,
        "assigned_to": (
            task.assigned_to.get_full_name()
            or task.assigned_to.email
        ),
        "deadline": (
            task.deadline.isoformat()
            if task.deadline
            else None
        ),
        "status": task.status,
        "status_display": task.get_status_display(),
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def serialize_transaction(transaction):
    return {
        "id": transaction.id,
        "case_id": transaction.case_id,
        "case_number": (
            transaction.case.case_number
            if transaction.case
            else None
        ),
        "transaction_type": transaction.transaction_type,
        "transaction_type_display": (
            transaction.get_transaction_type_display()
        ),
        "amount": str(transaction.amount),
        "transaction_date": serialize_date(
            transaction.transaction_date
        ),
        "description": transaction.description,
        "reference": transaction.reference,
        "recorded_by": (
            transaction.recorded_by.get_full_name()
            or transaction.recorded_by.email
        ),
        "created_at": transaction.created_at.isoformat(),
    }


@login_required
@require_GET
def client_profile(request, client_id):
    user = request.user

    client = get_object_or_404(
        Client.objects.select_related("created_by"),
        id=client_id,
    )

    if not user_can_access_client(user, client):
        return JsonResponse(
            {
                "success": False,
                "message": "Client not found.",
            },
            status=404,
        )

    # Client 360 should show every case belonging to this client
    # once the current user has permission to access the client.
    cases = (
        Case.objects.filter(client=client)
        .select_related(
            "case_type",
            "assigned_lawyer",
        )
        .order_by("-created_at")
    )

    case_ids = list(
        cases.values_list("id", flat=True)
    )

    hearings = (
        Hearing.objects.filter(
            case_id__in=case_ids,
        )
        .select_related("case")
        .order_by(
            "hearing_date",
            "hearing_time",
        )
    )

    documents = (
        Document.objects.filter(
            client=client,
        )
        .select_related(
            "case",
            "uploaded_by",
        )
        .order_by("-created_at")
    )

    if user.role == "lawyer":
        documents = documents.filter(
            Q(client__created_by=user)
            | Q(case__assigned_lawyer=user)
        ).distinct()

    tasks = (
        Task.objects.filter(
            case_id__in=case_ids,
        )
        .select_related(
            "case",
            "assigned_to",
        )
        .order_by(
            "status",
            "deadline",
        )
    )

    transactions = (
        FinancialTransaction.objects.filter(
            client=client,
        )
        .select_related(
            "case",
            "recorded_by",
        )
        .order_by(
            "-transaction_date",
            "-created_at",
        )
    )

    total_invoiced = sum(
        (
            transaction.amount
            for transaction in transactions
            if transaction.transaction_type
            == FinancialTransaction.TransactionType.INVOICE
        ),
        0,
    )

    total_paid = sum(
        (
            transaction.amount
            for transaction in transactions
            if transaction.transaction_type
            == FinancialTransaction.TransactionType.PAYMENT
        ),
        0,
    )

    total_expenses = sum(
        (
            transaction.amount
            for transaction in transactions
            if transaction.transaction_type
            == FinancialTransaction.TransactionType.EXPENSE
        ),
        0,
    )

    total_refunds = sum(
        (
            transaction.amount
            for transaction in transactions
            if transaction.transaction_type
            == FinancialTransaction.TransactionType.REFUND
        ),
        0,
    )

    balance = (
        total_invoiced
        - total_paid
        + total_expenses
        - total_refunds
    )

    activity = []

    activity.append(
        {
            "type": "client_created",
            "title": "Client created",
            "description": (
                f"{client.full_name} was added "
                "to the system."
            ),
            "date": client.created_at.isoformat(),
        }
    )

    for case in cases:
        activity.append(
            {
                "type": "case",
                "title": f"Case {case.case_number}",
                "description": (
                    f"{case.title} — "
                    f"{case.get_status_display()}"
                ),
                "date": case.created_at.isoformat(),
            }
        )

    for document in documents:
        activity.append(
            {
                "type": "document",
                "title": "Document uploaded",
                "description": (
                    document.original_filename
                    or document.title
                ),
                "date": document.created_at.isoformat(),
            }
        )

    for hearing in hearings:
        activity.append(
            {
                "type": "hearing",
                "title": "Hearing scheduled",
                "description": (
                    f"{hearing.case.case_number} — "
                    f"{hearing.purpose}"
                ),
                "date": hearing.created_at.isoformat(),
            }
        )

    for transaction in transactions:
        activity.append(
            {
                "type": "finance",
                "title": (
                    transaction.get_transaction_type_display()
                ),
                "description": (
                    f"{transaction.amount} JOD"
                ),
                "date": transaction.created_at.isoformat(),
            }
        )

    activity.sort(
        key=lambda item: item["date"],
        reverse=True,
    )

    return JsonResponse(
        {
            "success": True,
            "client": {
                "id": client.id,
                "full_name": client.full_name,
                "national_id": client.national_id,
                "phone": client.phone,
                "alternative_phone": client.alternative_phone,
                "client_type": client.client_type,
                "client_type_display": (
                    client.get_client_type_display()
                ),
                "email": client.email,
                "address": client.address,
                "date_of_birth": serialize_date(
                    client.date_of_birth
                ),
                "notes": client.notes,
                "created_by": (
                    client.created_by.get_full_name()
                    or client.created_by.email
                ),
                "created_at": client.created_at.isoformat(),
                "updated_at": client.updated_at.isoformat(),
            },
            "statistics": {
                "cases": cases.count(),
                "hearings": hearings.count(),
                "documents": documents.count(),
                "tasks": tasks.count(),
                "transactions": transactions.count(),
                "total_invoiced": str(total_invoiced),
                "total_paid": str(total_paid),
                "total_expenses": str(total_expenses),
                "total_refunds": str(total_refunds),
                "balance": str(balance),
            },
            "cases": [
                serialize_case(case)
                for case in cases
            ],
            "hearings": [
                serialize_hearing(hearing)
                for hearing in hearings
            ],
            "documents": [
                serialize_document(document)
                for document in documents
            ],
            "tasks": [
                serialize_task(task)
                for task in tasks
            ],
            "transactions": [
                serialize_transaction(transaction)
                for transaction in transactions
            ],
            "activity": activity[:100],
        }
    )