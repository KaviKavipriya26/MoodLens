import os
from datetime import timedelta
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "change-me-in-production"
DEBUG = True
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions",
    "django.contrib.messages", "rest_framework", "corsheaders", "api"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", "django.middleware.common.CommonMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware"]
ROOT_URLCONF = "mindscan_backend.urls"
WSGI_APPLICATION = "mindscan_backend.wsgi.application"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.contrib.auth.context_processors.auth",
    "django.contrib.messages.context_processors.messages"]}}]
# SQLite by default (zero setup). For MySQL: set USE_MYSQL=1 and fill the values below.
if os.environ.get("USE_MYSQL") == "1":
    DATABASES = {"default": {"ENGINE": "django.db.backends.mysql", "NAME": os.environ.get("DB_NAME", "mindscan"),
        "USER": os.environ.get("DB_USER", "root"), "PASSWORD": os.environ.get("DB_PASS", ""),
        "HOST": os.environ.get("DB_HOST", "localhost"), "PORT": "3306"}}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
CORS_ALLOW_ALL_ORIGINS = True  # restrict to your frontend URL in production
CORS_ALLOW_HEADERS = ["authorization", "content-type"]
REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"]}
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(days=1)}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
