import json

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from accounts.models import User
from cases.models import Case

from .models import Task


MANAGE_TASK_ROLES = {
    User.Role.SUPER_ADMIN,
    User.Role.LAWYER,
    User.Role.LEGAL_ASSISTANT,
}


def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "deadline": (
            task.deadline.isoformat()
            if task.deadline
            else None
        ),
        "status": task.status,
        "status_display": task.get_status_display(),
        "case": {
            "id": task.case.id,
            "case_number": task.case.case_number,
            "title": task.case.title,
            "client": {
                "id": task.case.client.id,
                "full_name": task.case.client.full_name,
            },
        },
        "assigned_to": {
            "id": task.assigned_to.id,
            "username": task.assigned_to.username,
            "email": task.assigned_to.email,
            "first_name": task.assigned_to.first_name,
            "last_name": task.assigned_to.last_name,
            "role": task.assigned_to.role,
        },
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def can_manage_tasks(user):
    return (
        user.is_superuser
        or user.role in MANAGE_TASK_ROLES
    )


def can_access_task(user, task):
    if user.is_superuser:
        return True

    if user.role == User.Role.SUPER_ADMIN:
        return True

    if user.role == User.Role.LEGAL_ASSISTANT:
        return True

    if user.role == User.Role.LAWYER:
        return (
            task.assigned_to_id == user.id
            or task.case.assigned_lawyer_id == user.id
            or task.case.client.created_by_id == user.id
        )

    return False


def validate_task_data(data, user, existing_task=None):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")

    if existing_task is not None:
        title = data.get(
            "title",
            existing_task.title,
        )

        description = data.get(
            "description",
            existing_task.description,
        )

        case_id = data.get(
            "case_id",
            existing_task.case_id,
        )

        assigned_to_id = data.get(
            "assigned_to_id",
            existing_task.assigned_to_id,
        )

        deadline = data.get(
            "deadline",
            (
                existing_task.deadline.isoformat()
                if existing_task.deadline
                else None
            ),
        )

        status = data.get(
            "status",
            existing_task.status,
        )
    else:
        title = data.get("title")
        description = data.get("description", "")
        case_id = data.get("case_id")
        assigned_to_id = data.get(
            "assigned_to_id",
            user.id,
        )
        deadline = data.get("deadline")
        status = data.get(
            "status",
            Task.Status.TODO,
        )

    if not isinstance(title, str):
        raise ValueError("Title must be a string.")

    title = title.strip()

    if not title:
        raise ValueError("Title is required.")

    if len(title) > 255:
        raise ValueError(
            "Title cannot exceed 255 characters."
        )

    if not isinstance(description, str):
        raise ValueError(
            "Description must be a string."
        )

    if not case_id:
        raise ValueError("Case is required.")

    try:
        case = Case.objects.select_related(
            "client",
            "assigned_lawyer",
        ).get(
            pk=int(case_id),
        )
    except (
        Case.DoesNotExist,
        TypeError,
        ValueError,
    ):
        raise ValueError("Selected case does not exist.")

    if not assigned_to_id:
        raise ValueError(
            "Assigned user is required."
        )

    try:
        assigned_to = User.objects.get(
            pk=int(assigned_to_id),
        )
    except (
        User.DoesNotExist,
        TypeError,
        ValueError,
    ):
        raise ValueError(
            "Selected assigned user does not exist."
        )

    allowed_statuses = {
        choice[0]
        for choice in Task.Status.choices
    }

    if status not in allowed_statuses:
        raise ValueError("Invalid task status.")

    if deadline == "":
        deadline = None

    if deadline is not None and not isinstance(
        deadline,
        str,
    ):
        raise ValueError(
            "Deadline must be an ISO date/time string."
        )

    return {
        "title": title,
        "description": description.strip(),
        "case": case,
        "assigned_to": assigned_to,
        "deadline": deadline,
        "status": status,
    }


def get_task_queryset():
    return Task.objects.select_related(
        "case",
        "case__client",
        "case__assigned_lawyer",
        "assigned_to",
    )


@login_required
@csrf_exempt
@require_http_methods(["GET", "POST"])
def tasks_list_create(request):
    user = request.user

    if not can_manage_tasks(user):
        return JsonResponse(
            {
                "success": False,
                "message": "You do not have permission to manage tasks.",
            },
            status=403,
        )

    if request.method == "GET":
        tasks = get_task_queryset()

        if user.role == User.Role.LAWYER:
            tasks = tasks.filter(
                Q(assigned_to=user)
                | Q(case__assigned_lawyer=user)
                | Q(case__client__created_by=user)
            ).distinct()

        search = request.GET.get(
            "search",
            "",
        ).strip()

        case_id = request.GET.get(
            "case_id",
            "",
        ).strip()

        assigned_to_id = request.GET.get(
            "assigned_to",
            "",
        ).strip()

        status = request.GET.get(
            "status",
            "",
        ).strip()

        if search:
            tasks = tasks.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(case__title__icontains=search)
                | Q(case__case_number__icontains=search)
                | Q(
                    case__client__full_name__icontains=search
                )
            )

        if case_id:
            try:
                tasks = tasks.filter(
                    case_id=int(case_id),
                )
            except ValueError:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Invalid case_id.",
                    },
                    status=400,
                )

        if assigned_to_id:
            try:
                tasks = tasks.filter(
                    assigned_to_id=int(
                        assigned_to_id
                    ),
                )
            except ValueError:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Invalid assigned_to.",
                    },
                    status=400,
                )

        if status:
            allowed_statuses = {
                choice[0]
                for choice in Task.Status.choices
            }

            if status not in allowed_statuses:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Invalid task status.",
                    },
                    status=400,
                )

            tasks = tasks.filter(
                status=status,
            )

        return JsonResponse(
            {
                "success": True,
                "count": tasks.count(),
                "tasks": [
                    serialize_task(task)
                    for task in tasks
                ],
            }
        )

    try:
        data = json.loads(
            request.body or "{}"
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON.",
            },
            status=400,
        )

    try:
        validated = validate_task_data(
            data,
            user,
        )
    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    if user.role == User.Role.LAWYER:
        case = validated["case"]

        if (
            case.assigned_lawyer_id != user.id
            and case.client.created_by_id != user.id
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to create a task for this case."
                    ),
                },
                status=403,
            )

    task = Task.objects.create(
        case=validated["case"],
        title=validated["title"],
        description=validated["description"],
        assigned_to=validated["assigned_to"],
        deadline=validated["deadline"],
        status=validated["status"],
    )

    task = get_task_queryset().get(
        pk=task.pk,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Task created successfully.",
            "task": serialize_task(task),
        },
        status=201,
    )


@login_required
@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def task_detail(request, task_id):
    try:
        task = get_task_queryset().get(
            pk=task_id,
        )
    except Task.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Task not found.",
            },
            status=404,
        )

    user = request.user

    if request.method == "GET":
        if not can_access_task(
            user,
            task,
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to view this task."
                    ),
                },
                status=403,
            )

        return JsonResponse(
            {
                "success": True,
                "task": serialize_task(task),
            }
        )

    if not can_manage_tasks(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to manage tasks."
                ),
            },
            status=403,
        )

    if not can_access_task(
        user,
        task,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to modify this task."
                ),
            },
            status=403,
        )

    if request.method == "DELETE":
        task.delete()

        return JsonResponse(
            {
                "success": True,
                "message": "Task deleted successfully.",
            }
        )

    try:
        data = json.loads(
            request.body or "{}"
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON.",
            },
            status=400,
        )

    try:
        validated = validate_task_data(
            data,
            user,
            existing_task=task,
        )
    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    if user.role == User.Role.LAWYER:
        case = validated["case"]

        if (
            case.assigned_lawyer_id != user.id
            and case.client.created_by_id != user.id
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to assign this task to this case."
                    ),
                },
                status=403,
            )

    task.case = validated["case"]
    task.title = validated["title"]
    task.description = validated["description"]
    task.assigned_to = validated["assigned_to"]
    task.deadline = validated["deadline"]
    task.status = validated["status"]
    task.save()

    task = get_task_queryset().get(
        pk=task.pk,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Task updated successfully.",
            "task": serialize_task(task),
        }
    )