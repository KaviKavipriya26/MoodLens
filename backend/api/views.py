import csv
import re
from datetime import date

from django.contrib.auth.hashers import check_password, make_password
from django.http import HttpResponse
from pymongo.errors import DuplicateKeyError
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import analytics
from .auth import make_token
from .db import get_db, local_now, oid, today_str, utcnow
from .ml import analyze_text, model_info
from .pdf_report import build_pdf

MAX_TEXT = 1000
EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")


def err(msg, code=400):
    return Response({"error": msg}, status=code)


def ser(a):
    return {"id": str(a["_id"]), "text": a["text"], "label": a["label"], "conf": a["conf"], "sev": a["sev"], "pol": a["pol"],
            "p": a.get("p"), "emo": a["emo"], "emojis": a.get("emojis", []), "slang": a.get("slang", []),
            "words": a.get("words", []), "crisis": a.get("crisis", False), "date": a["date"]}


def ser_mood(m):
    return {"id": str(m["_id"]), "mood": m["mood"], "note": m.get("note", ""), "date": m["date"], "analysis": m.get("analysis")}


def _analysis_doc(uid, text, explain_words=True):
    r = analyze_text(text, explain_words=explain_words)
    return {"user_id": uid, "text": text, **r, "date": today_str(), "created": utcnow()}


def _mood_list(uid):
    cur = get_db().moods.find({"user_id": uid}).sort([("date", -1), ("created", -1)]).limit(500)
    return [ser_mood(m) for m in cur]


def _valid_date(s):
    try:
        date.fromisoformat(s)
        return True
    except (TypeError, ValueError):
        return False


def _mood_analysis(note):
    if not note.strip():
        return None
    r = analyze_text(note, explain_words=False)
    return {k: r[k] for k in ("label", "conf", "sev", "p", "crisis")}


# ------------------------------------------------------------------ auth / account
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    d = request.data
    email, pw = (d.get("email") or "").strip().lower(), d.get("password") or ""
    if not EMAIL_RE.match(email) or len(pw) < 6:
        return err("Valid email and 6+ char password required")
    name = (d.get("name") or "").strip()[:60]
    try:
        res = get_db().users.insert_one({"email": email, "name": name, "password": make_password(pw), "created": utcnow()})
    except DuplicateKeyError:
        return err("Email already registered")
    return Response({"token": make_token(res.inserted_id), "user": {"name": name, "email": email}})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    email = (request.data.get("email") or "").strip().lower()
    u = get_db().users.find_one({"email": email})
    if not u or not check_password(request.data.get("password") or "", u["password"]):
        return err("Invalid email or password", 401)
    return Response({"token": make_token(u["_id"]), "user": {"name": u.get("name") or email.split("@")[0], "email": email}})


@api_view(["POST"])
def profile(request):
    name = (request.data.get("name") or "").strip()[:60]
    if not name:
        return err("Name is required")
    get_db().users.update_one({"_id": request.user.id}, {"$set": {"name": name}})
    return Response({"name": name, "email": request.user.email})


@api_view(["POST"])
def change_password(request):
    cur, new = request.data.get("current_password") or "", request.data.get("new_password") or ""
    if len(new) < 6:
        return err("New password must be 6+ characters")
    if not check_password(cur, request.user.doc["password"]):
        return err("Current password is incorrect", 403)
    get_db().users.update_one({"_id": request.user.id}, {"$set": {"password": make_password(new)}})
    return Response({"ok": True})


@api_view(["POST"])
def delete_account(request):
    if not check_password(request.data.get("password") or "", request.user.doc["password"]):
        return err("Password is incorrect", 403)
    db, uid = get_db(), request.user.id
    db.analyses.delete_many({"user_id": uid})
    db.moods.delete_many({"user_id": uid})
    db.users.delete_one({"_id": uid})
    return Response({"ok": True})


# ------------------------------------------------------------------ analysis
@api_view(["POST"])
def analyze(request):
    text = (request.data.get("text") or "").strip()
    if not text:
        return err("Text is required")
    if len(text) > MAX_TEXT:
        return err(f"Text too long (max {MAX_TEXT} characters)")
    doc = _analysis_doc(request.user.id, text)
    if request.data.get("preview"):  # analyse without saving (used by the journal "Analyze" button)
        doc["_id"] = ""
        return Response({**ser(doc), "id": None})
    get_db().analyses.insert_one(doc)
    return Response(ser(doc))


@api_view(["POST"])
def bulk(request):
    raw = request.data.get("texts") or []
    texts = [x.strip()[:MAX_TEXT] for x in raw if isinstance(x, str) and x.strip()][:500]
    if not texts:
        return err("No texts provided")
    docs = [_analysis_doc(request.user.id, x, explain_words=False) for x in texts]
    get_db().analyses.insert_many(docs)
    return Response([ser(d) for d in docs])


@api_view(["GET", "DELETE"])
def history(request):
    db, uid = get_db(), request.user.id
    if request.method == "DELETE":
        _id = oid(request.query_params.get("id"))
        if not _id:
            return err("Invalid id")
        db.analyses.delete_one({"_id": _id, "user_id": uid})
        return Response(status=204)
    return Response([ser(a) for a in db.analyses.find({"user_id": uid}).sort("created", -1).limit(1000)])


# ------------------------------------------------------------------ mood journal
@api_view(["GET", "POST", "PUT", "DELETE"])
def mood(request):
    db, uid, d = get_db(), request.user.id, request.data
    if request.method == "POST":
        try:
            val = int(d.get("mood"))
        except (TypeError, ValueError):
            return err("Mood must be 1-5")
        day = d.get("date") or today_str()
        note = (d.get("note") or "").strip()[:MAX_TEXT]
        if not 1 <= val <= 5 or not _valid_date(day):
            return err("Invalid mood or date")
        db.moods.insert_one({"user_id": uid, "mood": val, "note": note, "date": day, "analysis": _mood_analysis(note), "created": utcnow()})
    elif request.method == "PUT":
        _id = oid(d.get("id"))
        cur = db.moods.find_one({"_id": _id, "user_id": uid}) if _id else None
        if not cur:
            return err("Entry not found", 404)
        upd = {}
        if "note" in d:
            note = (d.get("note") or "").strip()[:MAX_TEXT]
            upd.update(note=note, analysis=_mood_analysis(note))
        if "mood" in d:
            try:
                val = int(d.get("mood"))
            except (TypeError, ValueError):
                return err("Mood must be 1-5")
            if not 1 <= val <= 5:
                return err("Mood must be 1-5")
            upd["mood"] = val
        if upd:
            db.moods.update_one({"_id": _id}, {"$set": upd})
    elif request.method == "DELETE":
        _id = oid(request.query_params.get("id"))
        if not _id:
            return err("Invalid id")
        db.moods.delete_one({"_id": _id, "user_id": uid})
    return Response(_mood_list(uid))


# ------------------------------------------------------------------ summary / model / reports
@api_view(["GET"])
def summary(request):
    return Response(analytics.build_summary(request.user.id))


@api_view(["GET"])
def metrics(request):
    import json
    from django.conf import settings
    out = {**model_info(), "metrics": None}
    p = settings.BASE_DIR / "models" / "metrics.json"
    if p.exists():
        try:
            out["metrics"] = json.loads(p.read_text(encoding="utf-8"))
        except ValueError:
            pass
    return Response(out)


def _csv_safe(v):
    s = str(v)
    return "'" + s if s and s[0] in "=+-@" else s


@api_view(["GET", "POST"])
def report(request):
    """GET  /api/report?fmt=csv|pdf&from=YYYY-MM-DD&to=YYYY-MM-DD  -> file download
       POST {from,to} -> summary counts for the range"""
    src = request.query_params if request.method == "GET" else request.data
    f, t = src.get("from") or "", src.get("to") or ""
    if (f and not _valid_date(f)) or (t and not _valid_date(t)):
        return err("Invalid date range")
    db, uid = get_db(), request.user.id
    q = {"user_id": uid}
    rng = {k: v for k, v in (("$gte", f), ("$lte", t)) if v}
    if rng:
        q["date"] = rng
    analyses = list(db.analyses.find(q).sort("created", -1))
    mq = {"user_id": uid, **({"date": rng} if rng else {})}

    if request.method == "POST":
        ps = [a["p"] for a in analyses if a.get("p") is not None]
        moods = [m["mood"] for m in db.moods.find(mq, {"mood": 1})]
        n, dep = len(analyses), sum(a["label"] == "Depressed" for a in analyses)
        return Response({"total": n, "depressed": dep, "non_depressed": n - dep,
                         "avg_risk": round(sum(ps) / len(ps) * 100) if ps else None,
                         "avg_mood": round(sum(moods) / len(moods), 2) if moods else None, "mood_entries": len(moods)})

    fmt = (request.query_params.get("fmt") or "csv").lower()
    if fmt == "pdf":
        moods = list(db.moods.find(mq, {"mood": 1}))
        pdf = build_pdf(request.user.name or request.user.email.split("@")[0], request.user.email, analyses, moods, f, t,
                        local_now().strftime("%Y-%m-%d %H:%M"))
        r = HttpResponse(pdf, content_type="application/pdf")
        r["Content-Disposition"] = 'attachment; filename="mindscan_report.pdf"'
        return r
    r = HttpResponse(content_type="text/csv; charset=utf-8")
    r["Content-Disposition"] = 'attachment; filename="mindscan_report.csv"'
    r.write("\ufeff")  # BOM so Excel shows Tamil text correctly
    w = csv.writer(r)
    w.writerow(["date", "text", "label", "confidence", "severity", "polarity", "risk_percent"])
    for a in analyses:
        w.writerow([a["date"], _csv_safe(a["text"]), a["label"], a["conf"], a["sev"], a["pol"],
                    round(a["p"] * 100) if a.get("p") is not None else ""])
    return r
