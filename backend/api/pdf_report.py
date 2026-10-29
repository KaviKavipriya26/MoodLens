"""PDF report (reportlab). Built-in PDF fonts are Latin-only, so Tamil/emoji characters print as '?' --
the CSV export keeps full Unicode text."""
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

MAX_ROWS = 200


def _safe(s, limit=None):
    s = (s or "").replace("\n", " ")
    if limit and len(s) > limit:
        s = s[:limit] + "..."
    return escape(s.encode("latin-1", "replace").decode("latin-1"))


def build_pdf(user_name, email, analyses, moods, date_from, date_to, generated):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                            title="MindScan report")
    ss = getSampleStyleSheet()
    small = ss["BodyText"].clone("small", fontSize=8, leading=10)
    story = [Paragraph("MindScan - Analysis Report", ss["Title"]),
             Paragraph(f"User: {_safe(user_name)} ({_safe(email)})<br/>Period: {_safe(date_from or 'start')} to {_safe(date_to or 'today')}"
                       f"<br/>Generated: {_safe(generated)}", ss["BodyText"]), Spacer(1, 8)]

    n = len(analyses)
    dep = sum(a["label"] == "Depressed" for a in analyses)
    ps = [a["p"] for a in analyses if a.get("p") is not None]
    sev = {k: sum(a["sev"] == k for a in analyses) for k in ("Low", "Moderate", "High")}
    mv = [m["mood"] for m in moods]
    rows = [["Total analyses", n], ["Depressed", dep], ["Non-Depressed", n - dep],
            ["Average risk", f"{round(sum(ps) / len(ps) * 100)}%" if ps else "-"],
            ["Severity (Low / Moderate / High)", f"{sev['Low']} / {sev['Moderate']} / {sev['High']}"],
            ["Mood journal entries", len(mv)], ["Average mood (1-5)", round(sum(mv) / len(mv), 2) if mv else "-"]]
    t = Table(rows, colWidths=[80 * mm, 60 * mm])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .4, colors.lightgrey), ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                           ("FONTSIZE", (0, 0), (-1, -1), 9)]))
    story += [Paragraph("Summary", ss["Heading2"]), t, Spacer(1, 10), Paragraph("Analyses", ss["Heading2"])]

    if analyses:
        data = [["Date", "Text", "Result", "Conf.", "Severity"]]
        for a in analyses[:MAX_ROWS]:
            data.append([a["date"], Paragraph(_safe(a["text"], 140), small), a["label"], f"{a['conf']}%", a["sev"]])
        tb = Table(data, colWidths=[22 * mm, 78 * mm, 30 * mm, 14 * mm, 22 * mm], repeatRows=1)
        tb.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .3, colors.lightgrey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2a9d8f")),
                                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTSIZE", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        story.append(tb)
        if n > MAX_ROWS:
            story.append(Paragraph(f"Showing the latest {MAX_ROWS} of {n} analyses. Use the CSV export for all rows.", small))
    else:
        story.append(Paragraph("No analyses in this period.", ss["BodyText"]))

    story += [Spacer(1, 12), Paragraph("This report is for awareness and research only. It is not a medical diagnosis. "
                                       "Non-English characters appear as '?' in this PDF; use the CSV export for full text.", small)]
    doc.build(story)
    return buf.getvalue()
