
from django.urls import path

from . import api_views


urlpatterns = [
    path(
        "",
        api_views.clients_list_create,
        name="clients-list-create",
    ),
    path(
        "<int:client_id>/",
        api_views.client_detail,
        name="client-detail",
    ),
]

