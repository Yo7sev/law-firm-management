from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from cases.models import Case
from clients.models import Client
from documents.models import Document
from hearings.models import Hearing
from tasks.models import Task


@login_required
@require_GET
def dashboard(request):
    user = request.user

    if user.is_superuser or user.role == "super_admin":
        cases = Case.objects.all()
        clients = Client.objects.all()
        hearings = Hearing.objects.all()
        tasks = Task.objects.all()
        documents = Document.objects.all()
    elif user.role == "lawyer":
        cases = Case.objects.filter(
            assigned_lawyer=user,
        )
        clients = Client.objects.filter(
            cases__assigned_lawyer=user,
        ).distinct()
        hearings = Hearing.objects.filter(
            case__assigned_lawyer=user,
        )
        tasks = Task.objects.filter(
            Q(assigned_to=user)
            | Q(case__assigned_lawyer=user)
        ).distinct()
        documents = Document.objects.filter(
            Q(uploaded_by=user)
            | Q(case__assigned_lawyer=user)
        ).distinct()
    else:
        cases = Case.objects.all()
        clients = Client.objects.all()
        hearings = Hearing.objects.all()
        tasks = Task.objects.filter(
            assigned_to=user,
        )
        documents = Document.objects.filter(
            uploaded_by=user,
        )

    today = timezone.localdate()

    active_cases_count = cases.filter(
        status=Case.Status.ACTIVE,
    ).count()

    total_clients_count = clients.count()

    upcoming_hearings_count = hearings.filter(
        hearing_date__gte=today,
    ).count()

    pending_tasks_count = tasks.exclude(
        status__in=[
            Task.Status.COMPLETED,
            Task.Status.CANCELLED,
        ],
    ).count()

    recent_cases = cases.select_related(
        "client",
        "case_type",
    ).order_by(
        "-created_at",
    )[:5]

    upcoming_hearings = hearings.select_related(
        "case",
        "case__client",
    ).filter(
        hearing_date__gte=today,
    ).order_by(
        "hearing_date",
        "hearing_time",
    )[:5]

    recent_documents = documents.select_related(
        "client",
        "case",
        "uploaded_by",
    ).order_by(
        "-created_at",
    )[:5]

    return JsonResponse(
        {
            "success": True,
            "dashboard": {
                "statistics": {
                    "active_cases": active_cases_count,
                    "total_clients": total_clients_count,
                    "upcoming_hearings": upcoming_hearings_count,
                    "pending_tasks": pending_tasks_count,
                },
                "recent_cases": [
                    {
                        "id": case.id,
                        "case_number": case.case_number,
                        "title": case.title,
                        "status": case.status,
                        "priority": case.priority,
                        "client": case.client.full_name,
                        "case_type": (
                            case.case_type.name
                            if case.case_type
                            else None
                        ),
                        "opening_date": case.opening_date.isoformat(),
                    }
                    for case in recent_cases
                ],
                "upcoming_hearings": [
                    {
                        "id": hearing.id,
                        "case_id": hearing.case_id,
                        "case_number": hearing.case.case_number,
                        "case_title": hearing.case.title,
                        "client": hearing.case.client.full_name,
                        "hearing_date": hearing.hearing_date.isoformat(),
                        "hearing_time": (
                            hearing.hearing_time.isoformat()
                            if hearing.hearing_time
                            else None
                        ),
                        "court": hearing.court,
                        "judge": hearing.judge,
                        "purpose": hearing.purpose,
                    }
                    for hearing in upcoming_hearings
                ],
                "recent_documents": [
                    {
                        "id": document.id,
                        "title": document.title,
                        "document_type": document.document_type,
                        "client": document.client.full_name,
                        "case": (
                            document.case.case_number
                            if document.case
                            else None
                        ),
                        "uploaded_by": document.uploaded_by.email,
                        "created_at": document.created_at.isoformat(),
                    }
                    for document in recent_documents
                ],
            },
        }
    )