from django.db import transaction

from notifications.models import Notification
from notifications.services import NotificationService

from .models import Case


class CaseService:
    @staticmethod
    @transaction.atomic
    def create(
        *,
        client,
        case_number,
        title,
        opening_date,
        assigned_lawyer=None,
        case_type=None,
        status=Case.Status.NEW,
        priority=Case.Priority.MEDIUM,
        court="",
        court_number="",
        judge="",
        opposing_party="",
        opposing_lawyer="",
        description="",
        closing_date=None,
    ):
        case = Case.objects.create(
            client=client,
            case_number=case_number,
            title=title,
            case_type=case_type,
            status=status,
            priority=priority,
            court=court,
            court_number=court_number,
            judge=judge,
            opposing_party=opposing_party,
            opposing_lawyer=opposing_lawyer,
            description=description,
            opening_date=opening_date,
            closing_date=closing_date,
            assigned_lawyer=assigned_lawyer,
        )

        if assigned_lawyer:
            NotificationService.create(
                user=assigned_lawyer,
                notification_type=Notification.NotificationType.CASE,
                title="New Case Assigned",
                message=(
                    f"A new case has been assigned to you: "
                    f"{case.case_number} - {case.title}."
                ),
                related_case=case,
            )

        return case