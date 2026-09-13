from django.urls import include, path

from . import api_views
from . import dashboard_api


urlpatterns = [
    path(
        "csrf/",
        api_views.csrf_token,
        name="csrf-token",
    ),
    path(
        "login/",
        api_views.login_view,
        name="api-login",
    ),
    path(
        "logout/",
        api_views.logout_view,
        name="api-logout",
    ),
    path(
        "me/",
        api_views.current_user,
        name="current-user",
    ),
    path(
        "dashboard/",
        dashboard_api.dashboard,
        name="dashboard",
    ),
    path(
        "clients/",
        include("clients.api_urls"),
    ),
    path(
        "cases/",
        include("cases.api_urls"),
    ),
    path(
        "hearings/",
        include("hearings.api_urls"),
    ),
    path(
        "documents/",
        include("documents.api_urls"),
    ),
    path(
        "tasks/",
        include("tasks.api_urls"),
    ),
]