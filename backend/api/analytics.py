"""Weekly summary, mood streak, 7-day negative trend alert, support status, 30-day combined series."""
from datetime import timedelta

from django.conf import settings

from .db import get_db, local_now


def _avg(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 2) if xs else None


def _window(by_day, start, end):
    moods, ps, dep, n = [], [], 0, 0
    d = start
    while d <= end:
        info = by_day.get(d.isoformat())
        if info:
            moods += info["moods"]
            ps += info["p"]
            dep += info["dep"]
            n += info["dep"] + info["non"]
        d += timedelta(days=1)
    return {"avg_mood": _avg(moods), "mood_entries": len(moods), "analyses": n, "depressed": dep,
            "avg_risk": round(_avg(ps) * 100) if ps else None}


def _day_negative(info):
    if not info:
        return None  # no data that day
    if info["moods"] and sum(info["moods"]) / len(info["moods"]) <= 2:
        return True
    return info["dep"] > info["non"]


def build_summary(uid):
    db = get_db()
    today = local_now().date()
    since = (today - timedelta(days=60)).isoformat()

    mood_dates = set(db.moods.distinct("date", {"user_id": uid}))
    by_day = {}

    def slot(d):
        return by_day.setdefault(d, {"moods": [], "p": [], "dep": 0, "non": 0})

    for m in db.moods.find({"user_id": uid, "date": {"$gte": since}}, {"date": 1, "mood": 1}):
        slot(m["date"])["moods"].append(m["mood"])
    for a in db.analyses.find({"user_id": uid, "date": {"$gte": since}}, {"date": 1, "p": 1, "label": 1}):
        s = slot(a["date"])
        if a.get("p") is not None:
            s["p"].append(a["p"])
        s["dep" if a["label"] == "Depressed" else "non"] += 1

    # streak: consecutive days with a mood entry, ending today (or yesterday if today isn't logged yet)
    logged_today = today.isoformat() in mood_dates
    cur = today if logged_today else today - timedelta(days=1)
    streak = 0
    while cur.isoformat() in mood_dates:
        streak += 1
        cur -= timedelta(days=1)

    week = _window(by_day, today - timedelta(days=6), today)
    prev = _window(by_day, today - timedelta(days=13), today - timedelta(days=7))
    change = round(week["avg_mood"] - prev["avg_mood"], 2) if week["avg_mood"] is not None and prev["avg_mood"] is not None else None

    # negative run: consecutive negative days ending today (or yesterday when today has no data yet)
    cur = today if by_day.get(today.isoformat()) else today - timedelta(days=1)
    run = 0
    while _day_negative(by_day.get(cur.isoformat())):
        run += 1
        cur -= timedelta(days=1)
    alert = run >= settings.TREND_ALERT_DAYS

    am, n, dep = week["avg_mood"], week["analyses"], week["depressed"]
    if am is None and n == 0:
        status = "none"
    elif alert or (am is not None and am <= 2.2) or (n >= 2 and dep / n >= .6):
        status = "low"
    elif am is not None and am >= 3.8 and (n == 0 or dep / n < .3):
        status = "good"
    else:
        status = "mid"

    series = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        info = by_day.get(d)
        if info and (info["moods"] or info["p"]):
            series.append({"date": d, "mood": _avg(info["moods"]), "risk": round(_avg(info["p"]) * 100) if info["p"] else None})

    return {"streak": streak, "logged_today": logged_today, "week": week, "prev_week": prev, "mood_change": change,
            "negative_run": run, "trend_alert": alert, "trend_alert_days": settings.TREND_ALERT_DAYS,
            "status": status, "series": series}
