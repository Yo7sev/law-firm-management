from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import render

from accounts.models import User


@login_required
def dashboard(request):
    user = request.user

    if user.is_superuser or user.role == User.Role.SUPER_ADMIN:
        raise PermissionDenied

    if user.role != User.Role.LAWYER:
        raise PermissionDenied

    context = {
        "user": user,
    }

    return render(request, "lawyer/dashboard.html", context)