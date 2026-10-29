from django.urls import path

from . import views

urlpatterns = [
    path("api/login", views.login), path("api/register", views.register),
    path("api/profile", views.profile), path("api/change-password", views.change_password),
    path("api/delete-account", views.delete_account),
    path("api/analyze", views.analyze), path("api/bulk-analyze", views.bulk), path("api/history", views.history),
    path("api/mood", views.mood), path("api/summary", views.summary), path("api/metrics", views.metrics),
    path("api/report", views.report),
]
