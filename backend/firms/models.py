from django.conf import settings
from django.db import models
from django.utils import timezone


class Firm(models.Model):
    name = models.CharField(max_length=255)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_firms",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class FirmMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        LAWYER = "lawyer", "Lawyer"
        SECRETARY = "secretary", "Secretary"
        ACCOUNTANT = "accountant", "Accountant"
        RECEPTIONIST = "receptionist", "Receptionist"
        VIEWER = "viewer", "Viewer"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    firm = models.ForeignKey(
        Firm,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="firm_memberships",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="firm_members_invited",
    )

    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "user"],
                name="unique_firm_membership",
            )
        ]
        ordering = ["firm", "role", "user__email"]

    def __str__(self):
        return f"{self.user.email} - {self.firm.name} ({self.role})"


class FirmInvitation(models.Model):
    class Role(models.TextChoices):
        LAWYER = "lawyer", "Lawyer"
        SECRETARY = "secretary", "Secretary"
        ACCOUNTANT = "accountant", "Accountant"
        RECEPTIONIST = "receptionist", "Receptionist"
        VIEWER = "viewer", "Viewer"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    firm = models.ForeignKey(
        Firm,
        on_delete=models.CASCADE,
        related_name="invitations",
    )

    email = models.EmailField()

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
    )

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="firm_invitations_sent",
    )

    token = models.CharField(
        max_length=128,
        unique=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField()

    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["email", "status"],
                name="firm_inv_email_status_idx",
            ),
            models.Index(
                fields=["token"],
                name="firm_inv_token_idx",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} - {self.firm.name} ({self.status})"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at