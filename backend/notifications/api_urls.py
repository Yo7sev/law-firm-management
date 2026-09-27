from django.urls import path

from . import views


urlpatterns = [
    path(
        "",
        views.notification_list,
        name="notification-list",
    ),
    path(
        "unread-count/",
        views.notification_unread_count,
        name="notification-unread-count",
    ),
    path(
        "<int:notification_id>/read/",
        views.notification_mark_read,
        name="notification-mark-read",
    ),
    path(
        "read-all/",
        views.notification_mark_all_read,
        name="notification-mark-all-read",
    ),
]