
import json

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from .models import Client


def serialize_client(client):
    return {
        "id": client.id,
        "full_name": client.full_name,
        "national_id": client.national_id,
        "phone": client.phone,
        "alternative_phone": client.alternative_phone,
        "client_type": client.client_type,
        "client_type_display": client.get_client_type_display(),
        "email": client.email,
        "address": client.address,
        "date_of_birth": (
            client.date_of_birth.isoformat()
            if client.date_of_birth
            else None
        ),
        "notes": client.notes,
        "created_by": {
            "id": client.created_by.id,
            "email": client.created_by.email,
        },
        "created_at": client.created_at.isoformat(),
        "updated_at": client.updated_at.isoformat(),
        "cases_count": client.cases.count(),
    }


def user_can_manage_clients(user):
    return (
        user.is_superuser
        or user.role in [
            "super_admin",
            "lawyer",
            "legal_assistant",
        ]
    )


@login_required
@require_http_methods(["GET", "POST"])
def clients_list_create(request):
    user = request.user

    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        client_type = request.GET.get("client_type", "").strip()

        clients = Client.objects.select_related(
            "created_by",
        )

        if not (
            user.is_superuser
            or user.role == "super_admin"
        ):
            if user.role == "lawyer":
                clients = clients.filter(
                    cases__assigned_lawyer=user,
                ).distinct()
            else:
                clients = clients.filter(
                    created_by=user,
                )

        if search:
            clients = clients.filter(
                Q(full_name__icontains=search)
                | Q(national_id__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
            )

        if client_type:
            clients = clients.filter(
                client_type=client_type,
            )

        clients = clients.order_by(
            "-created_at",
        )

        return JsonResponse(
            {
                "success": True,
                "clients": [
                    serialize_client(client)
                    for client in clients
                ],
                "count": clients.count(),
            }
        )

    if not user_can_manage_clients(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to create clients."
                ),
            },
            status=403,
        )

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    full_name = str(
        data.get("full_name", "")
    ).strip()

    national_id = str(
        data.get("national_id", "")
    ).strip()

    phone = str(
        data.get("phone", "")
    ).strip()

    alternative_phone = str(
        data.get("alternative_phone", "")
    ).strip()

    client_type = str(
        data.get("client_type", Client.ClientType.INDIVIDUAL)
    ).strip()

    email = str(
        data.get("email", "")
    ).strip()

    address = str(
        data.get("address", "")
    ).strip()

    date_of_birth = data.get("date_of_birth")

    notes = str(
        data.get("notes", "")
    ).strip()

    if not full_name:
        return JsonResponse(
            {
                "success": False,
                "message": "Full name is required.",
            },
            status=400,
        )

    if not national_id:
        return JsonResponse(
            {
                "success": False,
                "message": "National ID is required.",
            },
            status=400,
        )

    if not phone:
        return JsonResponse(
            {
                "success": False,
                "message": "Phone number is required.",
            },
            status=400,
        )

    valid_client_types = {
        choice[0]
        for choice in Client.ClientType.choices
    }

    if client_type not in valid_client_types:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid client type.",
            },
            status=400,
        )

    if Client.objects.filter(
        national_id=national_id,
    ).exists():
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "A client with this National ID "
                    "already exists."
                ),
            },
            status=409,
        )

    if email:
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError

        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Please enter a valid email address.",
                },
                status=400,
            )

    client = Client.objects.create(
        full_name=full_name,
        national_id=national_id,
        phone=phone,
        alternative_phone=alternative_phone,
        client_type=client_type,
        email=email,
        address=address,
        date_of_birth=date_of_birth or None,
        notes=notes,
        created_by=user,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Client created successfully.",
            "client": serialize_client(client),
        },
        status=201,
    )


@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def client_detail(request, client_id):
    user = request.user

    client = get_object_or_404(
        Client.objects.select_related(
            "created_by",
        ),
        id=client_id,
    )

    if not (
        user.is_superuser
        or user.role == "super_admin"
    ):
        if user.role == "lawyer":
            if not client.cases.filter(
                assigned_lawyer=user,
            ).exists():
                if client.created_by_id != user.id:
                    return JsonResponse(
                        {
                            "success": False,
                            "message": "Client not found.",
                        },
                        status=404,
                    )
        elif client.created_by_id != user.id:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Client not found.",
                },
                status=404,
            )

    if request.method == "GET":
        cases = client.cases.select_related(
            "case_type",
            "assigned_lawyer",
        )

        if not (
            user.is_superuser
            or user.role == "super_admin"
        ):
            if user.role == "lawyer":
                cases = cases.filter(
                    assigned_lawyer=user,
                )
            else:
                cases = cases.none()

        return JsonResponse(
            {
                "success": True,
                "client": serialize_client(client),
                "cases": [
                    {
                        "id": case.id,
                        "case_number": case.case_number,
                        "title": case.title,
                        "status": case.status,
                        "status_display": case.get_status_display(),
                        "priority": case.priority,
                        "priority_display": (
                            case.get_priority_display()
                        ),
                        "court": case.court,
                        "opening_date": (
                            case.opening_date.isoformat()
                        ),
                        "assigned_lawyer": (
                            case.assigned_lawyer.email
                            if case.assigned_lawyer
                            else None
                        ),
                    }
                    for case in cases
                ],
            }
        )

    if not user_can_manage_clients(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to modify clients."
                ),
            },
            status=403,
        )

    if request.method == "DELETE":
        client.delete()

        return JsonResponse(
            {
                "success": True,
                "message": "Client deleted successfully.",
            }
        )

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    allowed_fields = {
        "full_name",
        "national_id",
        "phone",
        "alternative_phone",
        "client_type",
        "email",
        "address",
        "date_of_birth",
        "notes",
    }

    for field in allowed_fields:
        if field in data:
            value = data[field]

            if field == "date_of_birth":
                setattr(
                    client,
                    field,
                    value or None,
                )
            else:
                setattr(
                    client,
                    field,
                    str(value).strip()
                    if value is not None
                    else "",
                )

    if not client.full_name:
        return JsonResponse(
            {
                "success": False,
                "message": "Full name is required.",
            },
            status=400,
        )

    if not client.national_id:
        return JsonResponse(
            {
                "success": False,
                "message": "National ID is required.",
            },
            status=400,
        )

    if not client.phone:
        return JsonResponse(
            {
                "success": False,
                "message": "Phone number is required.",
            },
            status=400,
        )

    valid_client_types = {
        choice[0]
        for choice in Client.ClientType.choices
    }

    if client.client_type not in valid_client_types:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid client type.",
            },
            status=400,
        )

    if Client.objects.filter(
        national_id=client.national_id,
    ).exclude(
        id=client.id,
    ).exists():
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Another client already uses "
                    "this National ID."
                ),
            },
            status=409,
        )

    client.save()

    return JsonResponse(
        {
            "success": True,
            "message": "Client updated successfully.",
            "client": serialize_client(client),
        }
    )

