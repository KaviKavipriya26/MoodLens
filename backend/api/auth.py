"""JWT login against the MongoDB users collection (no Django ORM)."""
from datetime import timedelta

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .db import get_db, oid, utcnow


class MongoUser:
    is_authenticated = True
    is_anonymous = False

    def __init__(self, doc):
        self.id = doc["_id"]
        self.email = doc["email"]
        self.name = doc.get("name", "")
        self.doc = doc


def make_token(user_id, days=1):
    now = utcnow()
    return jwt.encode({"sub": str(user_id), "iat": now, "exp": now + timedelta(days=days)}, settings.JWT_SECRET, algorithm="HS256")


class MongoJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        parts = request.META.get("HTTP_AUTHORIZATION", "").split()
        if not parts or parts[0].lower() != "bearer":
            return None
        if len(parts) != 2:
            raise AuthenticationFailed("Invalid Authorization header")
        try:
            payload = jwt.decode(parts[1], settings.JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Session expired. Please log in again.")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid session. Please log in again.")
        _id = oid(payload.get("sub"))
        doc = get_db().users.find_one({"_id": _id}) if _id else None
        if not doc:
            raise AuthenticationFailed("Account no longer exists.")
        return (MongoUser(doc), parts[1])

    def authenticate_header(self, request):
        return "Bearer"
