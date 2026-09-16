import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import User


@ensure_csrf_cookie
@require_GET
def csrf_token(request):
    token = get_token(request)

    return JsonResponse(
        {
            "success": True,
            "csrfToken": token,
            "message": "CSRF token generated successfully.",
        }
    )


@csrf_exempt
@require_POST
def login_view(request):
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

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return JsonResponse(
            {
                "success": False,
                "message": "Email and password are required.",
            },
            status=400,
        )

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid email or password.",
            },
            status=401,
        )

    authenticated_user = authenticate(
        request,
        username=user.username,
        password=password,
    )

    if authenticated_user is None:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid email or password.",
            },
            status=401,
        )

    if authenticated_user.is_superuser:
        login(request, authenticated_user)

        return JsonResponse(
            {
                "success": True,
                "message": "Login successful.",
                "user": {
                    "id": authenticated_user.id,
                    "email": authenticated_user.email,
                    "username": authenticated_user.username,
                    "first_name": authenticated_user.first_name,
                    "last_name": authenticated_user.last_name,
                    "role": "super_admin",
                    "approval_status": "approved",
                },
                "redirect": "/dashboard",
            }
        )

    if authenticated_user.approval_status == User.ApprovalStatus.PENDING:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Your account is still pending approval. "
                    "Please wait for the administrator to approve your account."
                ),
                "approval_status": "pending",
            },
            status=403,
        )

    if authenticated_user.approval_status == User.ApprovalStatus.REJECTED:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Your account has been rejected. "
                    "Please contact the administrator."
                ),
                "approval_status": "rejected",
            },
            status=403,
        )

    if authenticated_user.approval_status != User.ApprovalStatus.APPROVED:
        return JsonResponse(
            {
                "success": False,
                "message": "Your account has not been approved yet.",
                "approval_status": authenticated_user.approval_status,
            },
            status=403,
        )

    if not authenticated_user.is_active:
        return JsonResponse(
            {
                "success": False,
                "message": "Your account is inactive.",
            },
            status=403,
        )

    login(request, authenticated_user)

    redirect_map = {
        User.Role.SUPER_ADMIN: "/dashboard",
        User.Role.LAWYER: "/lawyer",
        User.Role.LEGAL_ASSISTANT: "/legal-assistant",
        User.Role.ACCOUNTANT: "/accountant",
        User.Role.RECEPTIONIST: "/receptionist",
        User.Role.VIEWER: "/viewer",
    }

    redirect_url = redirect_map.get(
        authenticated_user.role,
        "/dashboard",
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Login successful.",
            "user": {
                "id": authenticated_user.id,
                "email": authenticated_user.email,
                "username": authenticated_user.username,
                "first_name": authenticated_user.first_name,
                "last_name": authenticated_user.last_name,
                "role": authenticated_user.role,
                "approval_status": authenticated_user.approval_status,
            },
            "redirect": redirect_url,
        }
    )


@require_POST
def logout_view(request):
    logout(request)

    return JsonResponse(
        {
            "success": True,
            "message": "Logged out successfully.",
        }
    )


@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "authenticated": False,
                "user": None,
            }
        )

    user = request.user

    role = "super_admin" if user.is_superuser else user.role

    return JsonResponse(
        {
            "authenticated": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "approval_status": (
                    "approved"
                    if user.is_superuser
                    else user.approval_status
                ),
            },
        }
    )
