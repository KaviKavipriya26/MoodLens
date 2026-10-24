from django.urls import path
from . import views
urlpatterns = [path("api/login", views.login), path("api/register", views.register), path("api/analyze", views.analyze),
    path("api/bulk-analyze", views.bulk), path("api/history", views.history), path("api/mood", views.mood), path("api/report", views.report)]
