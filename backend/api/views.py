import csv
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .ml import analyze_text
from .models import Analysis, MoodEntry

def token_for(u): return str(RefreshToken.for_user(u).access_token)
def ser(a): return {"id": a.id, "text": a.text, "label": a.label, "conf": a.conf, "sev": a.sev, "pol": a.pol, "emo": a.emo,
                    "emojis": a.emojis, "slang": a.slang, "words": a.words, "date": a.created.date().isoformat()}

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    d = request.data
    email, pw = (d.get("email") or "").strip().lower(), d.get("password") or ""
    if not email or len(pw) < 6: return Response({"error": "Valid email and 6+ char password required"}, 400)
    if User.objects.filter(username=email).exists(): return Response({"error": "Email already registered"}, 400)
    u = User.objects.create_user(email, email, pw, first_name=d.get("name", ""))
    return Response({"token": token_for(u), "user": {"name": u.first_name, "email": email}})

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    u = authenticate(username=(request.data.get("email") or "").strip().lower(), password=request.data.get("password"))
    if not u: return Response({"error": "Invalid email or password"}, 401)
    return Response({"token": token_for(u), "user": {"name": u.first_name or u.username.split("@")[0], "email": u.email}})

@api_view(["POST"])
def analyze(request):
    text = (request.data.get("text") or "").strip()
    if not text: return Response({"error": "Text is required"}, 400)
    a = Analysis.objects.create(user=request.user, text=text, **analyze_text(text))
    return Response(ser(a))

@api_view(["POST"])
def bulk(request):
    texts = [x.strip() for x in (request.data.get("texts") or []) if x and x.strip()][:500]
    return Response([ser(Analysis.objects.create(user=request.user, text=x, **analyze_text(x))) for x in texts])

@api_view(["GET", "DELETE"])
def history(request):
    if request.method == "DELETE":
        Analysis.objects.filter(user=request.user, id=request.query_params.get("id")).delete()
        return Response(status=204)
    return Response([ser(a) for a in Analysis.objects.filter(user=request.user).order_by("-created")])

@api_view(["GET", "POST", "DELETE"])
def mood(request):
    if request.method == "POST":
        MoodEntry.objects.create(user=request.user, mood=request.data["mood"], note=request.data.get("note", ""), date=request.data["date"])
    if request.method == "DELETE":
        MoodEntry.objects.filter(user=request.user, id=request.query_params.get("id")).delete()
    return Response(list(MoodEntry.objects.filter(user=request.user).order_by("-date").values("id", "mood", "note", "date")))

@api_view(["GET", "POST"])
def report(request):
    qs = Analysis.objects.filter(user=request.user)
    f, t = request.query_params.get("from"), request.query_params.get("to")
    if f: qs = qs.filter(created__date__gte=f)
    if t: qs = qs.filter(created__date__lte=t)
    if request.method == "GET":  # CSV download: /api/report?from=2026-10-01&to=2026-10-23
        r = HttpResponse(content_type="text/csv"); r["Content-Disposition"] = 'attachment; filename="mindscan_report.csv"'
        w = csv.writer(r); w.writerow(["date", "text", "label", "confidence", "severity", "polarity"])
        for a in qs: w.writerow([a.created.date(), a.text, a.label, a.conf, a.sev, a.pol])
        return r
    n = qs.count(); d = qs.filter(label="Depressed").count()
    return Response({"total": n, "depressed": d, "non_depressed": n - d})
