from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_GET, require_POST

from .services import accept_invitation, get_pending_invitation


FRONTEND_URL = "http://127.0.0.1:3000"


@login_required
@require_POST
def accept_invitation_view(request, token):
    invitation = get_pending_invitation(token=token)

    if invitation is None:
        return JsonResponse(
            {
                "success": False,
                "message": "This invitation is invalid or expired.",
            },
            status=404,
        )

    if request.user.email.strip().lower() != invitation.email.strip().lower():
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "The Google account you signed in with "
                    "does not match the invitation email."
                ),
            },
            status=403,
        )

    try:
        membership = accept_invitation(
            invitation=invitation,
            user=request.user,
        )
    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "success": True,
            "message": "You have successfully joined the firm.",
            "firm": {
                "id": membership.firm.id,
                "name": membership.firm.name,
            },
            "membership": {
                "id": membership.id,
                "role": membership.role,
                "role_display": membership.get_role_display(),
                "status": membership.status,
            },
        }
    )


@login_required
@require_GET
def accept_google_invitation_view(request):
    token = request.session.get(
        "pending_firm_invitation_token"
    )

    if not token:
        return redirect(f"{FRONTEND_URL}/lawyer/")

    invitation = get_pending_invitation(token=token)

    if invitation is None:
        request.session.pop(
            "pending_firm_invitation_token",
            None,
        )
        request.session.save()

        return redirect(f"{FRONTEND_URL}/lawyer/")

    if (
        request.user.email.strip().lower()
        != invitation.email.strip().lower()
    ):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "The Google account you signed in with "
                    "does not match the invitation email."
                ),
            },
            status=403,
        )

    try:
        membership = accept_invitation(
            invitation=invitation,
            user=request.user,
        )
    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    request.session.pop(
        "pending_firm_invitation_token",
        None,
    )
    request.session.save()

    return redirect(f"{FRONTEND_URL}/lawyer/")


@login_required
def complete_google_invitation(request):
    token = request.session.get(
        "pending_firm_invitation_token"
    )

    if not token:
        return redirect(f"{FRONTEND_URL}/lawyer/")

    invitation = get_pending_invitation(
        token=token
    )

    if invitation is None:
        request.session.pop(
            "pending_firm_invitation_token",
            None,
        )
        request.session.save()

        return redirect(f"{FRONTEND_URL}/lawyer/")

    if (
        request.user.email.strip().lower()
        != invitation.email.strip().lower()
    ):
        return redirect(f"{FRONTEND_URL}/lawyer/")

    try:
        accept_invitation(
            invitation=invitation,
            user=request.user,
        )
    except ValueError:
        pass

    request.session.pop(
        "pending_firm_invitation_token",
        None,
    )
    request.session.save()

    return redirect(f"{FRONTEND_URL}/lawyer/")