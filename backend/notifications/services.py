from django.utils import timezone

from .models import Notification


class NotificationService:
    @staticmethod
    def create(
        *,
        user,
        notification_type,
        title,
        message,
        related_case=None,
        related_hearing=None,
        related_task=None,
        related_document=None,
    ):
        return Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_case=related_case,
            related_hearing=related_hearing,
            related_task=related_task,
            related_document=related_document,
        )

    @staticmethod
    def mark_as_read(notification):
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(
                update_fields=[
                    "is_read",
                    "read_at",
                ]
            )

        return notification

    @staticmethod
    def mark_as_unread(notification):
        if notification.is_read:
            notification.is_read = False
            notification.read_at = None
            notification.save(
                update_fields=[
                    "is_read",
                    "read_at",
                ]
            )

        return notification

    @staticmethod
    def mark_all_as_read(user):
        now = timezone.now()

        return Notification.objects.filter(
            user=user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=now,
        )

    @staticmethod
    def unread_count(user):
        return Notification.objects.filter(
            user=user,
            is_read=False,
        ).count()