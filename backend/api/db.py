"""MongoDB Atlas connection + small helpers."""
import os
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING, MongoClient

_db = None


def get_db():
    global _db
    if _db is not None:
        return _db
    uri = (os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI") or "").strip()
    if not uri:
        raise RuntimeError("MONGO_URI is not set. Copy .env.example to .env and paste your Atlas connection string.")
    kwargs = {"serverSelectionTimeoutMS": 8000, "tz_aware": True}
    try:  # Windows often lacks the CA bundle Atlas needs
        import certifi
        kwargs["tlsCAFile"] = certifi.where()
    except ImportError:
        pass
    db = MongoClient(uri, **kwargs)[os.environ.get("MONGO_DB", "mindscan")]
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.analyses.create_index([("user_id", ASCENDING), ("created", DESCENDING)])
    db.analyses.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
    db.moods.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    _db = db
    return _db


def utcnow():
    return datetime.now(timezone.utc)


def _tz():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(os.environ.get("APP_TZ", "Asia/Kolkata"))
    except Exception:  # tzdata missing / bad name
        return timezone.utc


def local_now():
    return datetime.now(_tz())


def today_str():
    return local_now().date().isoformat()


def oid(value):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None
