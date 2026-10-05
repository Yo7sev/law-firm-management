from django.urls import path

from . import api_views
from . import invitation_auth

urlpatterns = [
    path(
        "",
        api_views.current_firm_view,
        name="current-firm",
    ),
    path(
        "create/",
        api_views.create_firm_view,
        name="create-firm",
    ),
    path(
        "team/",
        api_views.team_view,
        name="firm-team",
    ),
    path(
        "invitations/",
        api_views.create_invitation_view,
        name="create-firm-invitation",
    ),
    path(
        "invitations/list/",
        api_views.invitations_view,
        name="firm-invitations",
    ),
    path(
        "invitations/<str:token>/",
        api_views.invitation_details_view,
        name="firm-invitation-details",
    ),
    path(
        "invitations/<str:token>/accept/",
        invitation_auth.accept_invitation_view,
        name="accept-firm-invitation",
    ),
    path(
    "invitations/<str:token>/google/",
    api_views.start_google_invitation_view,
    name="start-google-invitation",
    ),
    path(
    "invitations/google/complete/",
    invitation_auth.accept_google_invitation_view,
    name="accept-google-invitation",
    ),
    path(
    "invitations/google/complete/",
    invitation_auth.complete_google_invitation,
    name="complete-google-invitation",
),
]