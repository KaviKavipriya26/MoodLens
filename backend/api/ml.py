"""Analysis pipeline: emoji handling -> slang expansion -> TextBlob + emotion scoring -> classifier -> explanation.

Languages: English, Tamil script and Tanglish (romanised Tamil) -- starter lexicons, extend as needed.

CLASSIFIER: by default a lightweight lexicon heuristic runs so the project works out of the box.
TO USE YOUR TRAINED BERT-BiLSTM: create api/model_loader.py exposing  predict_proba(clean_text) -> float (0..1,
probability of "Depressed"). See api/model_loader_example.py. Nothing else needs to change.

EXPLAINABILITY: word contributions are computed by occlusion (re-scoring the text with each word removed and
measuring the change in probability). It is model-agnostic, so it works for the heuristic and for BERT-BiLSTM.
"""
import logging
import math
import re

import emoji
from textblob import TextBlob

log = logging.getLogger(__name__)

# ---------------------------------------------------------------- optional trained model
_model_predict = None
try:
    from .model_loader import predict_proba as _model_predict  # type: ignore
except ModuleNotFoundError as e:
    if not (e.name or "").endswith("model_loader"):
        log.error("model_loader.py found but a dependency is missing (%s). Using heuristic.", e)
except Exception as e:  # broken model file etc.
    log.error("model_loader.py failed to load: %s. Using heuristic.", e)

ENGINE = "BERT-BiLSTM" if _model_predict else "Lexicon heuristic (demo)"

# ---------------------------------------------------------------- lexicons
SLANG = {"idk": "I don't know", "tbh": "to be honest", "ngl": "not gonna lie", "idc": "I don't care",
         "smh": "shaking my head", "rn": "right now", "imo": "in my opinion", "omg": "oh my god",
         "brb": "be right back", "fml": "my life is terrible", "kms": "kill myself", "kys": "kill yourself"}
EMOJI_SENT = {"😢": "negative", "😭": "negative", "😞": "negative", "💔": "negative", "😔": "negative",
              "😊": "positive", "😂": "positive", "❤️": "positive", "😍": "positive", "😐": "neutral"}

# English (exact) + Tanglish (exact) + Tamil script (stem/prefix match)
NEG = {"sad": .4, "tired": .35, "alone": .45, "hopeless": .6, "worthless": .65, "cry": .4, "crying": .4, "empty": .5,
       "hate": .4, "nothing": .3, "lost": .35, "numb": .45, "exhausted": .4, "die": .7, "pointless": .6,
       "depressed": .6, "anxious": .35, "lonely": .45, "miserable": .5, "hurt": .35, "worried": .3,
       # Tanglish
       "kavalai": .4, "kavalaiya": .4, "sogam": .45, "azhugai": .4, "alugai": .4, "thanimai": .45, "tanimai": .45,
       "verumai": .5, "sorvu": .35, "kashtam": .4, "kastam": .4, "kashtama": .4, "vethanai": .45, "bayam": .35,
       "payam": .35, "kobam": .35, "pidikala": .35,
       # Tamil script (stems)
       "கவலை": .4, "சோகம்": .45, "அழுகை": .4, "அழுக": .4, "அழுது": .4, "தனிமை": .45, "வெறுமை": .5, "சோர்": .35,
       "வேதனை": .45, "கஷ்ட": .4, "மனச்சோர்வு": .6, "பயம்": .35, "பதற்ற": .35, "கோபம்": .35, "சாகணும்": .7}
POS = {"happy": .4, "great": .35, "love": .4, "good": .3, "fun": .3, "excited": .35, "thanks": .25, "better": .3,
       "grateful": .4, "calm": .3, "peaceful": .35,
       "santhosham": .4, "sandhosham": .4, "magizhchi": .4, "nandri": .25, "nalla": .3, "nimmathi": .35, "anbu": .35,
       "மகிழ்": .4, "சந்தோஷ": .4, "நன்றி": .25, "அன்பு": .35, "நல்ல": .3, "நிம்மதி": .35, "உற்சாக": .35}
# multi-word phrases (matched anywhere in the lower-cased text)
PHRASES = {"no reason to live": .8, "want to die": .8, "kill myself": .8, "end my life": .8, "end it all": .7,
           "hurt myself": .7, "suicide": .8, "suicidal": .8, "can't go on": .6, "cant go on": .6,
           "நம்பிக்கை இல்லை": .6, "வாழ பிடிக்கவில்லை": .7, "சாக வேண்டும்": .7, "மன அழுத்தம்": .55,
           "vazha pidikala": .7, "saga venum": .7, "saganum": .7}
CRISIS = {"no reason to live", "want to die", "kill myself", "end my life", "end it all", "hurt myself", "suicide",
          "suicidal", "சாகணும்", "வாழ பிடிக்கவில்லை", "சாக வேண்டும்", "vazha pidikala", "saga venum", "saganum"}
NEG_BEFORE = {"not", "no", "never", "dont", "don't", "cant", "can't", "cannot", "isnt", "isn't", "wasnt", "wasn't",
              "didnt", "didn't", "aint", "ain't"}
NEG_AFTER = {"illa", "illai", "ila", "இல்லை", "இல்ல"}

EMO_LEX = {
    "Sadness": {"sad", "cry", "crying", "empty", "lost", "alone", "lonely", "numb", "hopeless", "worthless", "depressed",
                "kavalai", "sogam", "azhugai", "thanimai", "verumai", "கவலை", "சோகம்", "அழுக", "தனிமை", "வெறுமை", "வேதனை"},
    "Anger": {"hate", "angry", "mad", "furious", "annoyed", "kobam", "கோபம்"},
    "Fear": {"scared", "afraid", "anxious", "worried", "panic", "bayam", "payam", "பயம்", "பதற்ற"},
    "Joy": {"happy", "great", "love", "fun", "excited", "grateful", "good", "santhosham", "magizhchi", "nalla",
            "மகிழ்", "சந்தோஷ", "நிம்மதி", "உற்சாக"},
}

TOKEN_RE = re.compile(r"[a-z\u0B80-\u0BFF']+")
_TAMIL = re.compile(r"[\u0B80-\u0BFF]")


def _lookup(tok, table):
    v = table.get(tok)
    if v is not None:
        return v
    if _TAMIL.search(tok):  # Tamil is agglutinative: match by stem (longest prefix)
        for n in range(len(tok) - 1, 2, -1):
            v = table.get(tok[:n])
            if v is not None:
                return v
    return None


def _in(tok, stems):
    if tok in stems:
        return True
    if _TAMIL.search(tok):
        return any(tok[:n] in stems for n in range(len(tok) - 1, 2, -1))
    return False


def _word_value(tokens, i):
    """+ pushes towards Depressed, - towards Non-Depressed. Handles simple negation (not happy / nalla illa)."""
    tok = tokens[i]
    v = _lookup(tok, NEG)
    if v is None:
        p = _lookup(tok, POS)
        v = -p if p is not None else None
    if v is None:
        return None
    prev = tokens[i - 1] if i > 0 else ""
    nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
    if prev in NEG_BEFORE or nxt in NEG_AFTER:
        v = -v * 0.8
    return v


# ---------------------------------------------------------------- classifier
def predict_prob(clean_text, score):
    if _model_predict is not None:
        return float(_model_predict(clean_text))
    return 1 / (1 + math.exp(-(score - 0.3) * 2.2))


def _features(text):
    text = text.replace("\u2019", "'")
    low = text.lower()
    emojis = []
    for e in emoji.emoji_list(text):
        ch = e["emoji"]
        emojis.append({"e": ch, "m": emoji.demojize(ch).strip(":").replace("_", " "), "s": EMOJI_SENT.get(ch, "neutral")})
    tokens = TOKEN_RE.findall(low)
    slang = [{"k": k, "m": SLANG[k]} for k in dict.fromkeys(tokens) if k in SLANG]
    clean = emoji.demojize(text, delimiters=(" ", " ")).replace("_", " ")
    for k, v in SLANG.items():
        clean = re.sub(rf"\b{k}\b", v, clean, flags=re.I)
    pol = round(TextBlob(clean).sentiment.polarity, 2)
    words, score, seen = [], 0.0, set()
    for i, w in enumerate(tokens):
        if w in seen:
            continue
        seen.add(w)
        v = _word_value(tokens, i)
        if v:
            words.append({"w": w, "v": round(v, 2)})
            score += v
    crisis = False
    for ph, wt in PHRASES.items():
        if ph in low:
            score += wt
            words.append({"w": ph, "v": round(wt, 2)})
            crisis = crisis or ph in CRISIS
    # slang that expands into a crisis phrase (e.g. "kms")
    crisis = crisis or any(k in {"kms"} for k in (s["k"] for s in slang))
    score += sum(.3 if e["s"] == "negative" else -.3 if e["s"] == "positive" else 0 for e in emojis) - pol * .8
    return {"clean": clean, "tokens": tokens, "emojis": emojis, "slang": slang, "pol": pol, "score": score,
            "words": words, "crisis": crisis}


def _prob(text):
    f = _features(text)
    return predict_prob(f["clean"], f["score"])


def _without(text, token):
    keep = []
    for chunk in text.split():
        if token not in TOKEN_RE.findall(chunk.lower().replace("\u2019", "'")):
            keep.append(chunk)
    return " ".join(keep)


def explain(text, p_full, tokens, limit=12, max_tokens=30):
    """Occlusion attribution: contribution = P(depressed | full) - P(depressed | word removed)."""
    out = []
    for tok in list(dict.fromkeys(tokens))[:max_tokens]:
        if len(tok) < 2:
            continue
        v = p_full - _prob(_without(text, tok))
        if abs(v) >= 0.01:
            out.append({"w": tok, "v": round(v, 3)})
    out.sort(key=lambda x: -abs(x["v"]))
    return out[:limit]


def analyze_text(text, explain_words=True):
    f = _features(text)
    p_raw = predict_prob(f["clean"], f["score"])
    p = p_raw
    crisis = f["crisis"]
    if crisis:
        p = max(p, 0.9)  # safety override: explicit self-harm language is always High
    words = explain(text, p_raw, f["tokens"]) if explain_words and f["tokens"] else f["words"]
    if explain_words and not words:
        words = f["words"]
    counts = {k: sum(_in(w, lex) for w in f["tokens"]) for k, lex in EMO_LEX.items()}
    counts["Neutral"] = max(1, len(f["tokens"]) // 4)
    tot = sum(counts.values()) or 1
    emo = {k: round(v * 100 / tot) for k, v in counts.items()}
    return {"label": "Depressed" if p >= .5 else "Non-Depressed", "conf": round(max(p, 1 - p) * 100),
            "sev": "Low" if p < .6 else "Moderate" if p < .8 else "High", "pol": f["pol"], "p": round(p, 4),
            "emo": emo, "emojis": f["emojis"], "slang": f["slang"], "words": words, "crisis": crisis}


def model_info():
    return {"engine": ENGINE, "trained_model_loaded": _model_predict is not None}
