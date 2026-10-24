"""Analysis pipeline: emoji handling -> slang expansion -> TextBlob + emotion scoring -> classifier.
The classifier below is a lightweight lexicon heuristic so the project runs out of the box.
TO USE YOUR TRAINED BERT-BiLSTM: edit predict_prob() (see comment) and keep the return value 0..1."""
import math, re
import emoji
from textblob import TextBlob

SLANG = {"idk": "I don't know", "tbh": "to be honest", "ngl": "not gonna lie", "idc": "I don't care",
         "smh": "shaking my head", "rn": "right now", "imo": "in my opinion", "omg": "oh my god", "brb": "be right back"}
EMOJI_SENT = {"😢": "negative", "😭": "negative", "😞": "negative", "💔": "negative", "😔": "negative",
              "😊": "positive", "😂": "positive", "❤️": "positive", "😍": "positive", "😐": "neutral"}
NEG = {"sad": .4, "tired": .35, "alone": .45, "hopeless": .6, "worthless": .65, "cry": .4, "empty": .5, "hate": .4,
       "nothing": .3, "lost": .35, "numb": .45, "exhausted": .4, "die": .7, "pointless": .6, "depressed": .6, "anxious": .35}
POS = {"happy": .4, "great": .35, "love": .4, "good": .3, "fun": .3, "excited": .35, "thanks": .25, "better": .3, "grateful": .4}
EMO_LEX = {"Sadness": {"sad", "cry", "empty", "lost", "alone", "numb", "hopeless", "worthless", "depressed"},
           "Anger": {"hate", "angry", "mad", "furious", "annoyed"}, "Fear": {"scared", "afraid", "anxious", "worried", "panic"},
           "Joy": {"happy", "great", "love", "fun", "excited", "grateful", "good"}}

def predict_prob(clean_text, score):
    # >>> Plug in BERT-BiLSTM here, e.g.:
    # from .model_loader import model, tokenizer
    # return float(model(tokenizer(clean_text))[0])
    return 1 / (1 + math.exp(-(score - 0.3) * 2.2))

def analyze_text(text):
    emojis = []
    for e in emoji.emoji_list(text):
        ch = e["emoji"]
        emojis.append({"e": ch, "m": emoji.demojize(ch).strip(":").replace("_", " "), "s": EMOJI_SENT.get(ch, "neutral")})
    tokens = re.findall(r"[a-z']+", text.lower())
    slang = [{"k": k, "m": SLANG[k]} for k in dict.fromkeys(tokens) if k in SLANG]
    clean = emoji.demojize(text, delimiters=(" ", " ")).replace("_", " ")
    for k, v in SLANG.items():
        clean = re.sub(rf"\b{k}\b", v, clean, flags=re.I)
    pol = round(TextBlob(clean).sentiment.polarity, 2)
    words, score = [], 0.0
    for w in dict.fromkeys(tokens):
        v = NEG.get(w) or -POS.get(w, 0)
        if v:
            words.append({"w": w, "v": round(v, 2)}); score += v
    score += sum(.3 if e["s"] == "negative" else -.3 if e["s"] == "positive" else 0 for e in emojis) - pol * .8
    p = predict_prob(clean, score)
    counts = {k: sum(w in lex for w in tokens) for k, lex in EMO_LEX.items()}
    counts["Neutral"] = max(1, len(tokens) // 4)
    tot = sum(counts.values()) or 1
    emo = {k: round(v * 100 / tot) for k, v in counts.items()}
    return {"label": "Depressed" if p >= .5 else "Non-Depressed", "conf": round(max(p, 1 - p) * 100),
            "sev": "Low" if p < .6 else "Moderate" if p < .8 else "High", "pol": pol, "emo": emo,
            "emojis": emojis, "slang": slang, "words": words}
