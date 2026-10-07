import json
from datetime import date, datetime

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from cases.models import Case
from firms.models import FirmMembership
from firms.services import get_user_firm_membership

from .models import Hearing


def get_active_firm(user):
    membership = get_user_firm_membership(user=user)

    if membership is None:
        return None

    if membership.status != FirmMembership.Status.ACTIVE:
        return None

    return membership.firm


def can_manage_hearings(user):
    if user.is_superuser or user.role == "super_admin":
        return True

    membership = get_user_firm_membership(user=user)

    if membership is None:
        return False

    return (
        membership.status == FirmMembership.Status.ACTIVE
        and membership.role
        in {
            FirmMembership.Role.OWNER,
            FirmMembership.Role.LAWYER,
            FirmMembership.Role.SECRETARY,
        }
    )


def case_belongs_to_firm(case, firm):
    if case is None or firm is None:
        return False

    return case.client.created_by.firm_memberships.filter(
        firm=firm,
        status=FirmMembership.Status.ACTIVE,
    ).exists()


def get_visible_hearings(user):
    firm = get_active_firm(user)

    if firm is None:
        return Hearing.objects.none()

    return Hearing.objects.filter(
        case__client__created_by__firm_memberships__firm=firm,
        case__client__created_by__firm_memberships__status=FirmMembership.Status.ACTIVE,
    ).distinct()


def serialize_hearing(hearing):
    return {
        "id": hearing.id,
        "case": {
            "id": hearing.case.id,
            "case_number": hearing.case.case_number,
            "title": hearing.case.title,
            "court": hearing.case.court,
            "judge": hearing.case.judge,
        },
        "case_id": hearing.case_id,
        "client": {
            "id": hearing.case.client.id,
            "full_name": hearing.case.client.full_name,
        },
        "hearing_date": (
            hearing.hearing_date.isoformat()
            if hearing.hearing_date
            else None
        ),
        "hearing_time": (
            hearing.hearing_time.strftime("%H:%M")
            if hearing.hearing_time
            else None
        ),
        "court": hearing.court or hearing.case.court,
        "judge": hearing.judge or hearing.case.judge,
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
        existing_hearing.case_id if existing_hearing else None,
    )

    # ---------------------------------------------------------
    # HEARING DATE
    # ---------------------------------------------------------

    if existing_hearing and "hearing_date" not in data:
        hearing_date = (
            existing_hearing.hearing_date.isoformat()
            if existing_hearing.hearing_date
            else None
        )
    else:
        raw_hearing_date = data.get("hearing_date")

        if raw_hearing_date in [None, ""]:
            hearing_date = None
        else:
            hearing_date = str(raw_hearing_date).strip()

    # ---------------------------------------------------------
    # HEARING TIME
    # ---------------------------------------------------------

    if existing_hearing and "hearing_time" not in data:
        hearing_time = (
            existing_hearing.hearing_time.strftime("%H:%M")
            if existing_hearing.hearing_time
            else None
        )
    else:
        hearing_time = data.get("hearing_time")

        if hearing_time in [None, ""]:
            hearing_time = None
        else:
            hearing_time = str(hearing_time).strip()

    # ---------------------------------------------------------
    # PURPOSE
    # ---------------------------------------------------------

    purpose = str(
        data.get(
            "purpose",
            existing_hearing.purpose if existing_hearing else "",
        )
    ).strip()

    # ---------------------------------------------------------
    # REQUIRED FIELDS
    # ---------------------------------------------------------

    if not case_id:
        errors["case_id"] = "Case is required."

    if not purpose:
        errors["purpose"] = "Hearing purpose is required."

    # ---------------------------------------------------------
    # CASE VALIDATION
    # ---------------------------------------------------------

    case = None

    if case_id:
        try:
            case = (
                Case.objects.select_related(
                    "client",
                    "client__created_by",
                )
                .get(pk=case_id)
            )
        except (
            Case.DoesNotExist,
            ValueError,
            TypeError,
        ):
            errors["case_id"] = "Selected case does not exist."

    # ---------------------------------------------------------
    # DATE VALIDATION
    # ---------------------------------------------------------

    if hearing_date:
        try:
            parsed_hearing_date = date.fromisoformat(
                hearing_date,
            )

            if (
                case
                and case.closing_date
                and parsed_hearing_date > case.closing_date
            ):
                errors["hearing_date"] = (
                    "Hearing date cannot be after "
                    "the case closing date."
                )

        except ValueError:
            errors["hearing_date"] = (
                "Hearing date must use YYYY-MM-DD format."
            )

    # ---------------------------------------------------------
    # TIME VALIDATION
    # ---------------------------------------------------------

    normalized_hearing_time = None

    if hearing_time:
        normalized_hearing_time = hearing_time

        try:
            datetime.strptime(
                normalized_hearing_time,
                "%H:%M",
            )
        except ValueError:
            errors["hearing_time"] = (
                "Hearing time must use HH:MM format."
            )

    # ---------------------------------------------------------
    # OTHER FIELDS
    # ---------------------------------------------------------

    court = str(
        data.get(
            "court",
            existing_hearing.court if existing_hearing else "",
        )
    ).strip()

    judge = str(
        data.get(
            "judge",
            existing_hearing.judge if existing_hearing else "",
        )
    ).strip()

    result = str(
        data.get(
            "result",
            existing_hearing.result if existing_hearing else "",
        )
    ).strip()

    next_action = str(
        data.get(
            "next_action",
            existing_hearing.next_action
            if existing_hearing
            else "",
        )
    ).strip()

    notes = str(
        data.get(
            "notes",
            existing_hearing.notes if existing_hearing else "",
        )
    ).strip()

    return {
        "errors": errors,
        "case": case,
        "hearing_date": hearing_date,
        "hearing_time": normalized_hearing_time,
        "court": court,
        "judge": judge,
        "purpose": purpose,
        "result": result,
        "next_action": next_action,
        "notes": notes,
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
            "case__client__created_by",
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

    # ---------------------------------------------------------
    # SEARCH
    # ---------------------------------------------------------

    if search:
        hearings = hearings.filter(
            Q(case__case_number__icontains=search)
            | Q(case__title__icontains=search)
            | Q(case__client__full_name__icontains=search)
            | Q(court__icontains=search)
            | Q(judge__icontains=search)
            | Q(purpose__icontains=search)
        )

    # ---------------------------------------------------------
    # CASE FILTER
    # ---------------------------------------------------------

    if case_id:
        hearings = hearings.filter(
            case_id=case_id,
        )

    # ---------------------------------------------------------
    # DATE FILTERS
    # ---------------------------------------------------------

    if date_from:
        hearings = hearings.filter(
            hearing_date__gte=date_from,
        )

    if date_to:
        hearings = hearings.filter(
            hearing_date__lte=date_to,
        )

    # ---------------------------------------------------------
    # UPCOMING
    # ---------------------------------------------------------

    if upcoming in [
        "1",
        "true",
        "yes",
    ]:
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

    active_firm = get_active_firm(user)

    if active_firm is None:
        return JsonResponse(
            {
                "success": False,
                "message": "You are not a member of an active firm.",
            },
            status=403,
        )

    if (
        validated["case"] is not None
        and not case_belongs_to_firm(
            validated["case"],
            active_firm,
        )
    ):
        return JsonResponse(
            {
                "success": False,
                "message": "The selected case does not belong to your firm.",
            },
            status=403,
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

    hearing = Hearing.objects.create(
        case=validated["case"],
        hearing_date=validated["hearing_date"],
        hearing_time=validated["hearing_time"],
        court=validated["court"],
        judge=validated["judge"],
        purpose=validated["purpose"],
        result=validated["result"],
        next_action=validated["next_action"],
        notes=validated["notes"],
    )

    hearing = (
        Hearing.objects.select_related(
            "case",
            "case__client",
            "case__client__created_by",
            "case__assigned_lawyer",
        )
        .get(pk=hearing.pk)
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Hearing created successfully.",
            "hearing": serialize_hearing(hearing),
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
                "case__client__created_by",
                "case__assigned_lawyer",
            )
            .get(pk=hearing_id)
        )
    except Hearing.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Hearing not found.",
            },
            status=404,
        )

    # ---------------------------------------------------------
    # GET
    # ---------------------------------------------------------

    if request.method == "GET":
        return JsonResponse(
            {
                "success": True,
                "hearing": serialize_hearing(hearing),
            }
        )

    # ---------------------------------------------------------
    # PERMISSION
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # DELETE
    # ---------------------------------------------------------

    if request.method == "DELETE":
        hearing.delete()

        return JsonResponse(
            {
                "success": True,
                "message": "Hearing deleted successfully.",
            }
        )

    # ---------------------------------------------------------
    # UPDATE
    # ---------------------------------------------------------

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

    active_firm = get_active_firm(user)

    if active_firm is None:
        return JsonResponse(
            {
                "success": False,
                "message": "You are not a member of an active firm.",
            },
            status=403,
        )

    if (
        validated["case"] is not None
        and not case_belongs_to_firm(
            validated["case"],
            active_firm,
        )
    ):
        return JsonResponse(
            {
                "success": False,
                "message": "The selected case does not belong to your firm.",
            },
            status=403,
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

    hearing.case = validated["case"]
    hearing.hearing_date = validated["hearing_date"]
    hearing.hearing_time = validated["hearing_time"]
    hearing.court = validated["court"]
    hearing.judge = validated["judge"]
    hearing.purpose = validated["purpose"]
    hearing.result = validated["result"]
    hearing.next_action = validated["next_action"]
    hearing.notes = validated["notes"]

    hearing.save()

    hearing = (
        Hearing.objects.select_related(
            "case",
            "case__client",
            "case__client__created_by",
            "case__assigned_lawyer",
        )
        .get(pk=hearing.pk)
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Hearing updated successfully.",
            "hearing": serialize_hearing(hearing),
        }
    )