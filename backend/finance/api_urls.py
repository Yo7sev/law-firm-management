from django.urls import path

from . import api_views

urlpatterns = [
    path(
        "clients/",
        api_views.finance_clients,
        name="finance-clients",
    ),
    path(
        "cases/",
        api_views.finance_cases,
        name="finance-cases",
    ),
    path(
        "<int:transaction_id>/",
        api_views.finance_transaction_detail,
        name="finance-transaction-detail",
    ),
    path(
        "",
        api_views.finance_transactions,
        name="finance-transactions",
    ),
]