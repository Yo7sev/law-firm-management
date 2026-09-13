from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.services import NotificationService

from .models import Task


class TaskService:
    @staticmethod
    @transaction.atomic
    def create(
        *,
        case,
        title,
        assigned_to,
        description="",
        deadline=None,
        status=Task.Status.TODO,
    ):
        if deadline is not None and timezone.is_naive(deadline):
            deadline = timezone.make_aware(
                deadline,
                timezone.get_current_timezone(),
            )

        task = Task.objects.create(
            case=case,
            title=title,
            description=description,
            assigned_to=assigned_to,
            deadline=deadline,
            status=status,
        )

        NotificationService.create(
            user=assigned_to,
            notification_type=Notification.NotificationType.TASK,
            title="New Task Assigned",
            message=(
                f"A new task has been assigned to you: "
                f"{task.title} for case {case.case_number}."
            ),
            related_case=case,
            related_task=task,
        )

        return task