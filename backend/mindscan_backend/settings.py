import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

try:  # read backend/.env if python-dotenv is installed
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
JWT_SECRET = os.environ.get("JWT_SECRET", SECRET_KEY)
DEBUG = os.environ.get("DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"]

# All data lives in MongoDB Atlas (see api/db.py), so Django's SQL database and
# auth/session apps are not used. That also means: no makemigrations / migrate needed.
INSTALLED_APPS = ["rest_framework", "corsheaders", "api"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", "django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "mindscan_backend.urls"
WSGI_APPLICATION = "mindscan_backend.wsgi.application"
DATABASES = {}

_origin = os.environ.get("FRONTEND_ORIGIN", "").strip()
if _origin:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _origin.split(",") if o.strip()]
else:
    CORS_ALLOW_ALL_ORIGINS = True  # development only
CORS_ALLOW_HEADERS = ["authorization", "content-type"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.MongoJWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "UNAUTHENTICATED_USER": None,
    "UNAUTHENTICATED_TOKEN": None,
    "EXCEPTION_HANDLER": "api.errors.handler",
}

TREND_ALERT_DAYS = int(os.environ.get("TREND_ALERT_DAYS", "7"))
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
