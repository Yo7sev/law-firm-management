from django.db import transaction

from notifications.models import Notification
from notifications.services import NotificationService

from .models import Hearing


class HearingService:
    @staticmethod
    @transaction.atomic
    def create(
        *,
        case,
        hearing_date,
        hearing_time,
        purpose,
        court="",
        judge="",
        result="",
        next_action="",
        notes="",
    ):
        hearing = Hearing.objects.create(
            case=case,
            hearing_date=hearing_date,
            hearing_time=hearing_time,
            court=court,
            judge=judge,
            purpose=purpose,
            result=result,
            next_action=next_action,
            notes=notes,
        )

        if case.assigned_lawyer:
            NotificationService.create(
                user=case.assigned_lawyer,
                notification_type=Notification.NotificationType.HEARING,
                title="New Hearing Scheduled",
                message=(
                    f"A new hearing has been scheduled for "
                    f"case {case.case_number} on {hearing.hearing_date}."
                ),
                related_case=case,
                related_hearing=hearing,
            )

        return hearing