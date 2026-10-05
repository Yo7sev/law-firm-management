import json
import secrets
from datetime import timedelta
import token

from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from .models import FirmInvitation, FirmMembership
from .services import (
    create_firm,
    get_pending_invitation,
    get_user_firm_membership,
    normalize_email,
    user_can_manage_team,
)


def _membership_payload(membership):
    user = membership.user

    return {
        "id": membership.id,
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": membership.role,
        "role_display": membership.get_role_display(),
        "status": membership.status,
        "joined_at": membership.joined_at,
    }


def _invitation_payload(invitation):
    return {
        "id": invitation.id,
        "email": invitation.email,
        "role": invitation.role,
        "role_display": invitation.get_role_display(),
        "status": invitation.status,
        "created_at": invitation.created_at,
        "expires_at": invitation.expires_at,
        "accepted_at": invitation.accepted_at,
    }


@login_required
@require_POST
def create_firm_view(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    name = str(data.get("name", "")).strip()

    if not name:
        return JsonResponse(
            {
                "success": False,
                "message": "Firm name is required.",
            },
            status=400,
        )

    if request.user.role != "lawyer":
        return JsonResponse(
            {
                "success": False,
                "message": "Only a lawyer can create a firm.",
            },
            status=403,
        )

    existing_membership = get_user_firm_membership(
        user=request.user,
    )

    if existing_membership:
        return JsonResponse(
            {
                "success": False,
                "message": "You are already a member of a firm.",
            },
            status=400,
        )

    firm = create_firm(
        user=request.user,
        name=name,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Firm created successfully.",
            "firm": {
                "id": firm.id,
                "name": firm.name,
                "owner_id": firm.owner_id,
                "created_at": firm.created_at,
            },
            "membership": {
                "role": FirmMembership.Role.OWNER,
                "status": FirmMembership.Status.ACTIVE,
            },
        },
        status=201,
    )


@login_required
@require_GET
def current_firm_view(request):
    membership = get_user_firm_membership(
        user=request.user,
    )

    if membership is None:
        return JsonResponse(
            {
                "success": True,
                "firm": None,
                "membership": None,
            }
        )

    return JsonResponse(
        {
            "success": True,
            "firm": {
                "id": membership.firm.id,
                "name": membership.firm.name,
                "owner_id": membership.firm.owner_id,
                "created_at": membership.firm.created_at,
            },
            "membership": _membership_payload(membership),
        }
    )


@login_required
@require_GET
def team_view(request):
    membership = get_user_firm_membership(
        user=request.user,
    )

    if membership is None:
        return JsonResponse(
            {
                "success": False,
                "message": "You are not a member of a firm.",
            },
            status=403,
        )

    members = (
        FirmMembership.objects.select_related("user")
        .filter(
            firm=membership.firm,
            status=FirmMembership.Status.ACTIVE,
        )
        .order_by(
            "role",
            "user__first_name",
            "user__last_name",
            "user__email",
        )
    )

    return JsonResponse(
        {
            "success": True,
            "members": [
                _membership_payload(member)
                for member in members
            ],
        }
    )


@login_required
@require_POST
def create_invitation_view(request):
    membership = get_user_firm_membership(
        user=request.user,
    )

    if membership is None:
        return JsonResponse(
            {
                "success": False,
                "message": "You are not a member of a firm.",
            },
            status=403,
        )

    if not user_can_manage_team(
        user=request.user,
        firm=membership.firm,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": "Only the firm owner can invite team members.",
            },
            status=403,
        )

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    email = normalize_email(data.get("email"))
    role = str(data.get("role", "")).strip().lower()

    allowed_roles = {
        FirmInvitation.Role.LAWYER,
        FirmInvitation.Role.SECRETARY,
        FirmInvitation.Role.ACCOUNTANT,
        FirmInvitation.Role.RECEPTIONIST,
        FirmInvitation.Role.VIEWER,
    }

    if not email:
        return JsonResponse(
            {
                "success": False,
                "message": "Email is required.",
            },
            status=400,
        )

    if role not in allowed_roles:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid invitation role.",
            },
            status=400,
        )

    if normalize_email(request.user.email) == email:
        return JsonResponse(
            {
                "success": False,
                "message": "You cannot invite your own email address.",
            },
            status=400,
        )

    existing_member = (
        FirmMembership.objects
        .filter(
            firm=membership.firm,
            user__email__iexact=email,
        )
        .first()
    )

    if existing_member:
        return JsonResponse(
            {
                "success": False,
                "message": "This user is already a member of the firm.",
            },
            status=400,
        )

    existing_invitation = (
        FirmInvitation.objects
        .filter(
            firm=membership.firm,
            email__iexact=email,
            status=FirmInvitation.Status.PENDING,
        )
        .first()
    )

    if existing_invitation and not existing_invitation.is_expired:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "There is already a pending invitation "
                    "for this email."
                ),
            },
            status=400,
        )

    token = secrets.token_urlsafe(48)
    expires_at = timezone.now() + timedelta(days=7)

    invitation = FirmInvitation.objects.create(
        firm=membership.firm,
        email=email,
        role=role,
        invited_by=request.user,
        token=token,
        expires_at=expires_at,
    )

    frontend_base_url = (
        request.headers.get(
            "Origin",
            "http://localhost:3000",
        ).rstrip("/")
    )

    invitation_url = (
        f"{frontend_base_url}/firm/invitations/{token}"
    )

    subject = f"Invitation to join {membership.firm.name}"

    message = (
        f"You have been invited to join "
        f"{membership.firm.name} "
        f"as a {invitation.get_role_display()}.\n\n"
        f"Accept the invitation here:\n"
        f"{invitation_url}\n\n"
        f"This invitation expires in 7 days."
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:
        invitation.delete()

        return JsonResponse(
            {
                "success": False,
                "message": (
                    "The invitation could not be sent. "
                    "Please check the email configuration."
                ),
            },
            status=500,
        )

    return JsonResponse(
        {
            "success": True,
            "message": "Invitation sent successfully.",
            "invitation": _invitation_payload(invitation),
        },
        status=201,
    )


@login_required
@require_GET
def invitations_view(request):
    membership = get_user_firm_membership(
        user=request.user,
    )

    if membership is None:
        return JsonResponse(
            {
                "success": False,
                "message": "You are not a member of a firm.",
            },
            status=403,
        )

    if not user_can_manage_team(
        user=request.user,
        firm=membership.firm,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": "Only the firm owner can view invitations.",
            },
            status=403,
        )

    invitations = (
        FirmInvitation.objects
        .filter(firm=membership.firm)
        .order_by("-created_at")
    )

    return JsonResponse(
        {
            "success": True,
            "invitations": [
                _invitation_payload(invitation)
                for invitation in invitations
            ],
        }
    )


@require_GET
def invitation_details_view(request, token):
    
    invitation = get_pending_invitation(
        token=token,
    )

    if invitation is None:
        print("INVITATION NOT FOUND")
        return JsonResponse(
            {
                "success": False,
                "message": "This invitation is invalid or expired.",
            },
            status=404,
        )

    print("INVITATION FOUND:", invitation.id)

    return JsonResponse(
        {
            "success": True,
            "invitation": {
                "firm_name": invitation.firm.name,
                "email": invitation.email,
                "role": invitation.role,
                "role_display": invitation.get_role_display(),
                "expires_at": invitation.expires_at,
            },
        }
    )


@require_GET
def start_google_invitation_view(request, token):
    invitation = get_pending_invitation(token=token)

    if invitation is None:
        return JsonResponse(
            {
                "success": False,
                "message": "This invitation is invalid or expired.",
            },
            status=404,
        )

    request.session["pending_firm_invitation_token"] = token
    request.session.save()

    return redirect("/accounts/google/login/")