import json

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from cases.models import Case

from .models import Hearing


def can_manage_hearings(user):
    return (
        user.is_superuser
        or user.role
        in [
            "super_admin",
            "lawyer",
            "legal_assistant",
        ]
    )


def get_visible_hearings(user):
    if user.is_superuser or user.role == "super_admin":
        return Hearing.objects.all()

    if user.role == "lawyer":
        return Hearing.objects.filter(
            case__assigned_lawyer=user,
        )

    if user.role == "legal_assistant":
        return Hearing.objects.all()

    return Hearing.objects.all()


def serialize_hearing(hearing):
    return {
        "id": hearing.id,
        "case": {
            "id": hearing.case.id,
            "case_number": hearing.case.case_number,
            "title": hearing.case.title,
        },
        "case_id": hearing.case_id,
        "client": {
            "id": hearing.case.client.id,
            "full_name": hearing.case.client.full_name,
        },
        "hearing_date": hearing.hearing_date.isoformat(),
        "hearing_time": (
            hearing.hearing_time.strftime("%H:%M")
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


def validate_hearing_data(data, existing_hearing=None):
    errors = {}

    case_id = data.get(
        "case_id",
        existing_hearing.case_id
        if existing_hearing
        else None,
    )

    hearing_date = str(
        data.get(
            "hearing_date",
            existing_hearing.hearing_date.isoformat()
            if existing_hearing
            else "",
        )
    ).strip()

    hearing_time = data.get(
        "hearing_time",
        existing_hearing.hearing_time.strftime("%H:%M")
        if existing_hearing and existing_hearing.hearing_time
        else None,
    )

    purpose = str(
        data.get(
            "purpose",
            existing_hearing.purpose
            if existing_hearing
            else "",
        )
    ).strip()

    if not case_id:
        errors["case_id"] = "Case is required."

    if not hearing_date:
        errors["hearing_date"] = (
            "Hearing date is required."
        )

    if not purpose:
        errors["purpose"] = (
            "Hearing purpose is required."
        )

    case = None

    if case_id:
        try:
            case = Case.objects.select_related(
                "client",
            ).get(pk=case_id)
        except (
            Case.DoesNotExist,
            ValueError,
            TypeError,
        ):
            errors["case_id"] = (
                "Selected case does not exist."
            )

    normalized_hearing_time = None

    if hearing_time not in [
        None,
        "",
    ]:
        normalized_hearing_time = str(
            hearing_time
        ).strip()

        try:
            from datetime import datetime

            datetime.strptime(
                normalized_hearing_time,
                "%H:%M",
            )
        except ValueError:
            errors["hearing_time"] = (
                "Hearing time must use HH:MM format."
            )

    closing_date = (
        case.closing_date
        if case
        else None
    )

    if (
        case
        and case.closing_date
        and hearing_date
    ):
        from datetime import date

        try:
            parsed_hearing_date = date.fromisoformat(
                hearing_date,
            )

            if parsed_hearing_date > closing_date:
                errors["hearing_date"] = (
                    "Hearing date cannot be after the case closing date."
                )
        except ValueError:
            errors["hearing_date"] = (
                "Hearing date must use YYYY-MM-DD format."
            )

    if hearing_date:
        from datetime import date

        try:
            date.fromisoformat(hearing_date)
        except ValueError:
            errors["hearing_date"] = (
                "Hearing date must use YYYY-MM-DD format."
            )

    return {
        "errors": errors,
        "case": case,
        "hearing_date": hearing_date,
        "hearing_time": normalized_hearing_time,
        "court": str(
            data.get(
                "court",
                existing_hearing.court
                if existing_hearing
                else "",
            )
        ).strip(),
        "judge": str(
            data.get(
                "judge",
                existing_hearing.judge
                if existing_hearing
                else "",
            )
        ).strip(),
        "purpose": purpose,
        "result": str(
            data.get(
                "result",
                existing_hearing.result
                if existing_hearing
                else "",
            )
        ).strip(),
        "next_action": str(
            data.get(
                "next_action",
                existing_hearing.next_action
                if existing_hearing
                else "",
            )
        ).strip(),
        "notes": str(
            data.get(
                "notes",
                existing_hearing.notes
                if existing_hearing
                else "",
            )
        ).strip(),
    }


@login_required
@require_GET
def hearings_list(request):
    user = request.user

    hearings = (
        get_visible_hearings(user)
        .select_related(
            "case",
            "case__client",
            "case__assigned_lawyer",
        )
    )

    search = request.GET.get(
        "search",
        "",
    ).strip()

    case_id = request.GET.get(
        "case_id",
        "",
    ).strip()

    date_from = request.GET.get(
        "date_from",
        "",
    ).strip()

    date_to = request.GET.get(
        "date_to",
        "",
    ).strip()

    upcoming = request.GET.get(
        "upcoming",
        "",
    ).strip().lower()

    if search:
        hearings = hearings.filter(
            Q(case__case_number__icontains=search)
            | Q(case__title__icontains=search)
            | Q(case__client__full_name__icontains=search)
            | Q(court__icontains=search)
            | Q(judge__icontains=search)
            | Q(purpose__icontains=search)
        )

    if case_id:
        hearings = hearings.filter(
            case_id=case_id,
        )

    if date_from:
        hearings = hearings.filter(
            hearing_date__gte=date_from,
        )

    if date_to:
        hearings = hearings.filter(
            hearing_date__lte=date_to,
        )

    if upcoming in [
        "1",
        "true",
        "yes",
    ]:
        from django.utils import timezone

        hearings = hearings.filter(
            hearing_date__gte=timezone.localdate(),
        )

    return JsonResponse(
        {
            "success": True,
            "count": hearings.count(),
            "hearings": [
                serialize_hearing(hearing)
                for hearing in hearings
            ],
        }
    )


@login_required
@csrf_exempt
@require_http_methods(["GET", "POST"])
def hearings_list_create(request):
    user = request.user

    if request.method == "GET":
        return hearings_list(request)

    if not can_manage_hearings(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to create hearings."
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

    validated = validate_hearing_data(data)

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Please correct the submitted data."
                ),
                "errors": validated["errors"],
            },
            status=400,
        )

    hearing = Hearing.objects.create(
        case=validated["case"],
        hearing_date=validated["hearing_date"],
        hearing_time=validated["hearing_time"] or None,
        court=validated["court"],
        judge=validated["judge"],
        purpose=validated["purpose"],
        result=validated["result"],
        next_action=validated["next_action"],
        notes=validated["notes"],
    )

    hearing = Hearing.objects.select_related(
        "case",
        "case__client",
        "case__assigned_lawyer",
    ).get(
        pk=hearing.pk,
    )

    return JsonResponse(
        {
            "success": True,
            "message": (
                "Hearing created successfully."
            ),
            "hearing": serialize_hearing(
                hearing,
            ),
        },
        status=201,
    )


@login_required
@csrf_exempt
@require_http_methods(
    [
        "GET",
        "PUT",
        "DELETE",
    ]
)
def hearing_detail(request, hearing_id):
    user = request.user

    try:
        hearing = (
            get_visible_hearings(user)
            .select_related(
                "case",
                "case__client",
                "case__assigned_lawyer",
            )
            .get(
                pk=hearing_id,
            )
        )
    except Hearing.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Hearing not found.",
            },
            status=404,
        )

    if request.method == "GET":
        return JsonResponse(
            {
                "success": True,
                "hearing": serialize_hearing(
                    hearing,
                ),
            }
        )

    if not can_manage_hearings(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to modify hearings."
                ),
            },
            status=403,
        )

    if request.method == "DELETE":
        hearing.delete()

        return JsonResponse(
            {
                "success": True,
                "message": (
                    "Hearing deleted successfully."
                ),
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

    validated = validate_hearing_data(
        data,
        existing_hearing=hearing,
    )

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Please correct the submitted data."
                ),
                "errors": validated["errors"],
            },
            status=400,
        )

    hearing.case = validated["case"]
    hearing.hearing_date = (
        validated["hearing_date"]
    )
    hearing.hearing_time = (
        validated["hearing_time"]
        or None
    )
    hearing.court = validated["court"]
    hearing.judge = validated["judge"]
    hearing.purpose = validated["purpose"]
    hearing.result = validated["result"]
    hearing.next_action = validated["next_action"]
    hearing.notes = validated["notes"]

    hearing.save()

    hearing = Hearing.objects.select_related(
        "case",
        "case__client",
        "case__assigned_lawyer",
    ).get(
        pk=hearing.pk,
    )

    return JsonResponse(
        {
            "success": True,
            "message": (
                "Hearing updated successfully."
            ),
            "hearing": serialize_hearing(
                hearing,
            ),
        }
    )