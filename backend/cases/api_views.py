
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
import json

from clients.models import Client

from .models import Case, CaseType


def can_manage_cases(user):
    return (
        user.is_superuser
        or user.role in [
            "super_admin",
            "lawyer",
            "legal_assistant",
        ]
    )


def get_visible_cases(user):
    if user.is_superuser or user.role == "super_admin":
        return Case.objects.all()

    if user.role == "lawyer":
        return Case.objects.filter(
            assigned_lawyer=user,
        )

    if user.role == "legal_assistant":
        return Case.objects.all()

    return Case.objects.all()


def serialize_case(case):
    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "client": {
            "id": case.client.id,
            "full_name": case.client.full_name,
        },
        "client_id": case.client_id,
        "case_type": (
            {
                "id": case.case_type.id,
                "name": case.case_type.name,
            }
            if case.case_type
            else None
        ),
        "case_type_id": case.case_type_id,
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
        "opening_date": case.opening_date.isoformat(),
        "closing_date": (
            case.closing_date.isoformat()
            if case.closing_date
            else None
        ),
        "assigned_lawyer": (
            {
                "id": case.assigned_lawyer.id,
                "email": case.assigned_lawyer.email,
                "first_name": case.assigned_lawyer.first_name,
                "last_name": case.assigned_lawyer.last_name,
            }
            if case.assigned_lawyer
            else None
        ),
        "assigned_lawyer_id": case.assigned_lawyer_id,
        "created_at": case.created_at.isoformat(),
        "updated_at": case.updated_at.isoformat(),
    }


def validate_case_data(data, existing_case=None):
    errors = {}

    case_number = str(
        data.get(
            "case_number",
            existing_case.case_number
            if existing_case
            else "",
        )
    ).strip()

    title = str(
        data.get(
            "title",
            existing_case.title
            if existing_case
            else "",
        )
    ).strip()

    client_id = data.get(
        "client_id",
        existing_case.client_id
        if existing_case
        else None,
    )

    opening_date = data.get(
        "opening_date",
        existing_case.opening_date.isoformat()
        if existing_case
        else "",
    )

    if not case_number:
        errors["case_number"] = "Case number is required."

    if not title:
        errors["title"] = "Case title is required."

    if not client_id:
        errors["client_id"] = "Client is required."

    if not opening_date:
        errors["opening_date"] = (
            "Opening date is required."
        )

    if case_number:
        duplicate_query = Case.objects.filter(
            case_number__iexact=case_number,
        )

        if existing_case:
            duplicate_query = duplicate_query.exclude(
                pk=existing_case.pk,
            )

        if duplicate_query.exists():
            errors["case_number"] = (
                "A case with this case number already exists."
            )

    client = None

    if client_id:
        try:
            client = Client.objects.get(pk=client_id)
        except (
            Client.DoesNotExist,
            ValueError,
            TypeError,
        ):
            errors["client_id"] = "Selected client does not exist."

    case_type = None
    case_type_id = data.get(
        "case_type_id",
        existing_case.case_type_id
        if existing_case
        else None,
    )

    if case_type_id not in [None, "", 0, "0"]:
        try:
            case_type = CaseType.objects.get(
                pk=case_type_id,
                is_active=True,
            )
        except (
            CaseType.DoesNotExist,
            ValueError,
            TypeError,
        ):
            errors["case_type_id"] = (
                "Selected case type does not exist."
            )

    status = data.get(
        "status",
        existing_case.status
        if existing_case
        else Case.Status.NEW,
    )

    valid_statuses = {
        choice[0]
        for choice in Case.Status.choices
    }

    if status not in valid_statuses:
        errors["status"] = "Invalid case status."

    priority = data.get(
        "priority",
        existing_case.priority
        if existing_case
        else Case.Priority.MEDIUM,
    )

    valid_priorities = {
        choice[0]
        for choice in Case.Priority.choices
    }

    if priority not in valid_priorities:
        errors["priority"] = "Invalid case priority."

    return {
        "errors": errors,
        "case_number": case_number,
        "title": title,
        "client": client,
        "case_type": case_type,
        "status": status,
        "priority": priority,
        "court": str(
            data.get(
                "court",
                existing_case.court
                if existing_case
                else "",
            )
        ).strip(),
        "court_number": str(
            data.get(
                "court_number",
                existing_case.court_number
                if existing_case
                else "",
            )
        ).strip(),
        "judge": str(
            data.get(
                "judge",
                existing_case.judge
                if existing_case
                else "",
            )
        ).strip(),
        "opposing_party": str(
            data.get(
                "opposing_party",
                existing_case.opposing_party
                if existing_case
                else "",
            )
        ).strip(),
        "opposing_lawyer": str(
            data.get(
                "opposing_lawyer",
                existing_case.opposing_lawyer
                if existing_case
                else "",
            )
        ).strip(),
        "description": str(
            data.get(
                "description",
                existing_case.description
                if existing_case
                else "",
            )
        ).strip(),
        "opening_date": opening_date,
        "closing_date": data.get(
            "closing_date",
            existing_case.closing_date.isoformat()
            if existing_case and existing_case.closing_date
            else None,
        ),
        "assigned_lawyer_id": data.get(
            "assigned_lawyer_id",
            existing_case.assigned_lawyer_id
            if existing_case
            else None,
        ),
    }


@login_required
@require_GET
def case_types_list(request):
    case_types = CaseType.objects.filter(
        is_active=True,
    ).order_by("name")

    return JsonResponse(
        {
            "success": True,
            "case_types": [
                {
                    "id": case_type.id,
                    "name": case_type.name,
                    "description": case_type.description,
                }
                for case_type in case_types
            ],
        }
    )


@login_required
@csrf_exempt
@require_http_methods(["GET", "POST"])
def cases_list_create(request):
    user = request.user

    if request.method == "GET":
        cases = get_visible_cases(user).select_related(
            "client",
            "case_type",
            "assigned_lawyer",
        )

        search = request.GET.get(
            "search",
            "",
        ).strip()

        status = request.GET.get(
            "status",
            "",
        ).strip()

        priority = request.GET.get(
            "priority",
            "",
        ).strip()

        case_type_id = request.GET.get(
            "case_type_id",
            "",
        ).strip()

        client_id = request.GET.get(
            "client_id",
            "",
        ).strip()

        if search:
            cases = cases.filter(
                Q(case_number__icontains=search)
                | Q(title__icontains=search)
                | Q(client__full_name__icontains=search)
                | Q(court__icontains=search)
                | Q(judge__icontains=search)
                | Q(opposing_party__icontains=search)
            )

        if status:
            cases = cases.filter(
                status=status,
            )

        if priority:
            cases = cases.filter(
                priority=priority,
            )

        if case_type_id:
            cases = cases.filter(
                case_type_id=case_type_id,
            )

        if client_id:
            cases = cases.filter(
                client_id=client_id,
            )

        return JsonResponse(
            {
                "success": True,
                "count": cases.count(),
                "cases": [
                    serialize_case(case)
                    for case in cases
                ],
            }
        )

    if not can_manage_cases(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to create cases."
                ),
            },
            status=403,
        )

    try:
        data = json.loads(
            request.body or "{}",
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    validated = validate_case_data(data)

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": "Please correct the submitted data.",
                "errors": validated["errors"],
            },
            status=400,
        )

    assigned_lawyer_id = (
        validated["assigned_lawyer_id"]
    )

    if assigned_lawyer_id in [
        None,
        "",
        0,
        "0",
    ]:
        assigned_lawyer_id = (
            user.id
            if user.role == "lawyer"
            else None
        )

    case = Case.objects.create(
        client=validated["client"],
        case_number=validated["case_number"],
        title=validated["title"],
        case_type=validated["case_type"],
        status=validated["status"],
        priority=validated["priority"],
        court=validated["court"],
        court_number=validated["court_number"],
        judge=validated["judge"],
        opposing_party=validated["opposing_party"],
        opposing_lawyer=validated["opposing_lawyer"],
        description=validated["description"],
        opening_date=validated["opening_date"],
        closing_date=validated["closing_date"] or None,
        assigned_lawyer_id=assigned_lawyer_id,
    )

    case = Case.objects.select_related(
        "client",
        "case_type",
        "assigned_lawyer",
    ).get(pk=case.pk)

    return JsonResponse(
        {
            "success": True,
            "message": "Case created successfully.",
            "case": serialize_case(case),
        },
        status=201,
    )


@login_required
@csrf_exempt
@require_http_methods(
    ["GET", "PUT", "DELETE"]
)
def case_detail(request, case_id):
    user = request.user

    try:
        case = get_visible_cases(user).select_related(
            "client",
            "case_type",
            "assigned_lawyer",
        ).get(pk=case_id)
    except Case.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Case not found.",
            },
            status=404,
        )

    if request.method == "GET":
        return JsonResponse(
            {
                "success": True,
                "case": serialize_case(case),
            }
        )

    if not can_manage_cases(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to modify cases."
                ),
            },
            status=403,
        )

    if request.method == "DELETE":
        try:
            case.delete()
        except Exception as error:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "This case cannot be deleted because "
                        "it is connected to other legal records."
                    ),
                    "detail": str(error),
                },
                status=409,
            )

        return JsonResponse(
            {
                "success": True,
                "message": "Case deleted successfully.",
            }
        )

    try:
        data = json.loads(
            request.body or "{}",
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    validated = validate_case_data(
        data,
        existing_case=case,
    )

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": "Please correct the submitted data.",
                "errors": validated["errors"],
            },
            status=400,
        )

    assigned_lawyer_id = (
        validated["assigned_lawyer_id"]
    )

    if assigned_lawyer_id in [
        "",
        0,
        "0",
    ]:
        assigned_lawyer_id = None

    case.client = validated["client"]
    case.case_number = validated["case_number"]
    case.title = validated["title"]
    case.case_type = validated["case_type"]
    case.status = validated["status"]
    case.priority = validated["priority"]
    case.court = validated["court"]
    case.court_number = validated["court_number"]
    case.judge = validated["judge"]
    case.opposing_party = validated["opposing_party"]
    case.opposing_lawyer = validated["opposing_lawyer"]
    case.description = validated["description"]
    case.opening_date = validated["opening_date"]
    case.closing_date = (
        validated["closing_date"]
        or None
    )
    case.assigned_lawyer_id = assigned_lawyer_id

    case.save()

    case = Case.objects.select_related(
        "client",
        "case_type",
        "assigned_lawyer",
    ).get(pk=case.pk)

    return JsonResponse(
        {
            "success": True,
            "message": "Case updated successfully.",
            "case": serialize_case(case),
        }
    )

