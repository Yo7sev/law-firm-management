from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import Firm, FirmInvitation, FirmMembership

User = get_user_model()


def create_firm(*, user, name):
    name = str(name or "").strip()

    if not name:
        raise ValueError("Firm name is required.")

    firm = Firm.objects.create(
        name=name,
        owner=user,
    )

    FirmMembership.objects.create(
        firm=firm,
        user=user,
        role=FirmMembership.Role.OWNER,
        status=FirmMembership.Status.ACTIVE,
        invited_by=None,
    )

    return firm


def get_user_firm_membership(*, user):
    return (
        FirmMembership.objects
        .select_related("firm")
        .filter(
            user=user,
            status=FirmMembership.Status.ACTIVE,
        )
        .first()
    )


def normalize_email(email):
    return str(email or "").strip().lower()


def user_can_manage_team(*, user, firm):
    if firm.owner_id != user.id:
        return False

    membership = (
        FirmMembership.objects
        .filter(
            firm=firm,
            user=user,
            status=FirmMembership.Status.ACTIVE,
            role=FirmMembership.Role.OWNER,
        )
        .first()
    )

    return membership is not None


def get_pending_invitation(*, token):
    invitation = (
        FirmInvitation.objects
        .select_related("firm", "invited_by")
        .filter(
            token=token,
            status=FirmInvitation.Status.PENDING,
        )
        .first()
    )

    if invitation is None:
        return None

    if invitation.expires_at <= timezone.now():
        invitation.status = FirmInvitation.Status.EXPIRED
        invitation.save(update_fields=["status"])
        return None

    return invitation


def _user_role_for_firm_role(firm_role):
    role_map = {
        FirmInvitation.Role.LAWYER: User.Role.LAWYER,
        FirmInvitation.Role.SECRETARY: User.Role.LEGAL_ASSISTANT,
        FirmInvitation.Role.ACCOUNTANT: User.Role.ACCOUNTANT,
        FirmInvitation.Role.RECEPTIONIST: User.Role.RECEPTIONIST,
        FirmInvitation.Role.VIEWER: User.Role.VIEWER,
    }

    try:
        return role_map[firm_role]
    except KeyError:
        raise ValueError("Invalid firm invitation role.")


@transaction.atomic
def accept_invitation(*, invitation, user):
    user_email = normalize_email(user.email)
    invitation_email = normalize_email(invitation.email)

    if user_email != invitation_email:
        raise ValueError(
            "The Google account email does not match the invitation email."
        )

    user_role = _user_role_for_firm_role(invitation.role)

    existing_membership = (
        FirmMembership.objects
        .filter(
            firm=invitation.firm,
            user=user,
        )
        .first()
    )

    if existing_membership:
        if existing_membership.status != FirmMembership.Status.ACTIVE:
            existing_membership.status = FirmMembership.Status.ACTIVE

        existing_membership.role = invitation.role
        existing_membership.invited_by = invitation.invited_by

        existing_membership.save(
            update_fields=[
                "status",
                "role",
                "invited_by",
            ]
        )

        membership = existing_membership

    else:
        membership = FirmMembership.objects.create(
            firm=invitation.firm,
            user=user,
            role=invitation.role,
            status=FirmMembership.Status.ACTIVE,
            invited_by=invitation.invited_by,
        )

    user.role = user_role
    user.approval_status = User.ApprovalStatus.APPROVED
    user.is_active = True

    user.save(
        update_fields=[
            "role",
            "approval_status",
            "is_active",
        ]
    )

    invitation.status = FirmInvitation.Status.ACCEPTED
    invitation.accepted_at = timezone.now()

    invitation.save(
        update_fields=[
            "status",
            "accepted_at",
        ]
    )

    return membership