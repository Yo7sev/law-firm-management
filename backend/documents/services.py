from django.db import transaction

from notifications.models import Notification
from notifications.services import NotificationService

from .models import Document


class DocumentService:
    @staticmethod
    @transaction.atomic
    def create(
        *,
        client,
        title,
        file,
        uploaded_by,
        document_type=Document.DocumentType.OTHER,
        case=None,
        description="",
    ):
        document = Document.objects.create(
            client=client,
            case=case,
            title=title,
            document_type=document_type,
            file=file,
            description=description,
            uploaded_by=uploaded_by,
        )

        if case and case.assigned_lawyer:
            NotificationService.create(
                user=case.assigned_lawyer,
                notification_type=Notification.NotificationType.DOCUMENT,
                title="New Document Uploaded",
                message=(
                    f"A new document has been uploaded for "
                    f"case {case.case_number}: {document.title}."
                ),
                related_case=case,
                related_document=document,
            )

        return document