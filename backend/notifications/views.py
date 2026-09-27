from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from .models import Notification
from .services import NotificationService


def serialize_notification(notification):
    related_url = None

    if notification.related_case_id:
        related_url = f"/lawyer/cases?case={notification.related_case_id}"
    elif notification.related_hearing_id:
        related_url = "/lawyer/hearings"
    elif notification.related_task_id:
        related_url = "/lawyer/tasks"
    elif notification.related_document_id:
        related_url = "/lawyer/documents"

    return {
        "id": notification.id,
        "notification_type": notification.notification_type,
        "notification_type_label": notification.get_notification_type_display(),
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
        "read_at": (
            notification.read_at.isoformat()
            if notification.read_at
            else None
        ),
        "related_case_id": notification.related_case_id,
        "related_hearing_id": notification.related_hearing_id,
        "related_task_id": notification.related_task_id,
        "related_document_id": notification.related_document_id,
        "related_url": related_url,
    }


@login_required
@require_GET
def notification_list(request):
    notifications = (
        Notification.objects.filter(
            user=request.user,
        )
        .select_related(
            "related_case",
            "related_hearing",
            "related_task",
            "related_document",
        )
        .order_by("-created_at")[:50]
    )

    unread_count = NotificationService.unread_count(
        request.user,
    )

    return JsonResponse(
        {
            "success": True,
            "notifications": [
                serialize_notification(notification)
                for notification in notifications
            ],
            "unread_count": unread_count,
        }
    )


@login_required
@require_GET
def notification_unread_count(request):
    return JsonResponse(
        {
            "success": True,
            "unread_count": NotificationService.unread_count(
                request.user,
            ),
        }
    )


@login_required
@require_POST
def notification_mark_read(request, notification_id):
    notification = get_object_or_404(
        Notification,
        id=notification_id,
        user=request.user,
    )

    NotificationService.mark_as_read(notification)

    return JsonResponse(
        {
            "success": True,
            "notification": serialize_notification(notification),
            "unread_count": NotificationService.unread_count(
                request.user,
            ),
        }
    )


@login_required
@require_POST
def notification_mark_all_read(request):
    updated_count = NotificationService.mark_all_as_read(
        request.user,
    )

    return JsonResponse(
        {
            "success": True,
            "updated_count": updated_count,
            "unread_count": 0,
        }
    )