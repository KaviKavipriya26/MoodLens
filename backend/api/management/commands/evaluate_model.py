"""python manage.py evaluate_model test.csv [--text-col text] [--label-col label]

Runs the active classifier (your BERT-BiLSTM if api/model_loader.py exists, else the heuristic) over a labelled
CSV and writes accuracy / precision / recall / F1 / confusion matrix to backend/models/metrics.json.
The Reports page shows these numbers. Labels: 1/0, depressed/non-depressed, true/false.
"""
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.ml import ENGINE, analyze_text

POS = {"1", "true", "yes", "depressed", "depression", "positive"}
NEG = {"0", "false", "no", "non-depressed", "non depressed", "not depressed", "normal", "negative"}


class Command(BaseCommand):
    help = "Evaluate the classifier on a labelled CSV and save metrics.json"

    def add_arguments(self, parser):
        parser.add_argument("csv_path")
        parser.add_argument("--text-col", default="text")
        parser.add_argument("--label-col", default="label")

    def handle(self, *a, csv_path, text_col, label_col, **o):
        tp = fp = fn = tn = 0
        with open(csv_path, newline="", encoding="utf-8-sig") as fh:
            rd = csv.DictReader(fh)
            if text_col not in (rd.fieldnames or []) or label_col not in (rd.fieldnames or []):
                raise CommandError(f"CSV needs columns '{text_col}' and '{label_col}'. Found: {rd.fieldnames}")
            for row in rd:
                lab = str(row[label_col]).strip().lower()
                if lab not in POS | NEG or not row[text_col].strip():
                    continue
                truth = lab in POS
                pred = analyze_text(row[text_col], explain_words=False)["label"] == "Depressed"
                tp += truth and pred
                fp += (not truth) and pred
                fn += truth and (not pred)
                tn += (not truth) and (not pred)
        n = tp + fp + fn + tn
        if not n:
            raise CommandError("No usable rows found.")
        prec = tp / (tp + fp) if tp + fp else 0.0
        rec = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
        out = {"engine": ENGINE, "samples": n, "accuracy": round((tp + tn) / n, 4), "precision": round(prec, 4),
               "recall": round(rec, 4), "f1": round(f1, 4), "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
               "evaluated_on": Path(csv_path).name, "evaluated_at": datetime.now(timezone.utc).isoformat()}
        dest = Path(settings.BASE_DIR) / "models" / "metrics.json"
        dest.parent.mkdir(exist_ok=True)
        dest.write_text(json.dumps(out, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"{n} rows -> accuracy {out['accuracy']:.1%}, F1 {out['f1']:.3f}. Saved {dest}"))
