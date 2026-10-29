import logging

from pymongo.errors import PyMongoError
from rest_framework.response import Response
from rest_framework.views import exception_handler

log = logging.getLogger(__name__)


def handler(exc, context):
    resp = exception_handler(exc, context)
    if resp is not None:
        if isinstance(resp.data, dict) and "detail" in resp.data and "error" not in resp.data:
            resp.data = {"error": str(resp.data["detail"])}
        return resp
    if isinstance(exc, PyMongoError):
        log.exception("MongoDB error")
        return Response({"error": "Database unavailable. Check MONGO_URI and Atlas > Network Access (allow your IP)."}, status=503)
    if isinstance(exc, RuntimeError) and "MONGO_URI" in str(exc):
        return Response({"error": str(exc)}, status=500)
    return None
