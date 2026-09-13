from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        LAWYER = "lawyer", "Lawyer"
        LEGAL_ASSISTANT = "legal_assistant", "Legal Assistant"
        ACCOUNTANT = "accountant", "Accountant"
        RECEPTIONIST = "receptionist", "Receptionist"
        VIEWER = "viewer", "Viewer"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.VIEWER,
    )

    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )

    def __str__(self):
        return self.email