"""EXAMPLE ONLY (not imported). To plug in your trained BERT-BiLSTM:

1. Copy this file to  api/model_loader.py
2. Put your saved model files in backend/models/
3. Edit predict_proba() so it returns P(Depressed) as a float between 0 and 1 for ONE cleaned text.
4. pip install the libraries your model needs (tensorflow / torch / transformers ...), restart the server.

The app detects model_loader.py automatically. If it fails to load, the log says why and the heuristic is used.
"""
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

# ---- Option A: Keras / TensorFlow (BERT-BiLSTM saved with model.save) ------------------------------------
# import tensorflow as tf
# from transformers import BertTokenizerFast
# tokenizer = BertTokenizerFast.from_pretrained(str(MODEL_DIR / "tokenizer"))
# model = tf.keras.models.load_model(MODEL_DIR / "bert_bilstm.keras")
#
# def predict_proba(clean_text: str) -> float:
#     enc = tokenizer(clean_text, truncation=True, padding="max_length", max_length=128, return_tensors="tf")
#     return float(model([enc["input_ids"], enc["attention_mask"]]).numpy().ravel()[0])

# ---- Option B: PyTorch ----------------------------------------------------------------------------------
# import torch
# from transformers import BertTokenizerFast
# tokenizer = BertTokenizerFast.from_pretrained(str(MODEL_DIR / "tokenizer"))
# model = torch.load(MODEL_DIR / "bert_bilstm.pt", map_location="cpu"); model.eval()
#
# def predict_proba(clean_text: str) -> float:
#     enc = tokenizer(clean_text, truncation=True, padding="max_length", max_length=128, return_tensors="pt")
#     with torch.no_grad():
#         return float(torch.sigmoid(model(**enc)).item())

def predict_proba(clean_text: str) -> float:
    raise NotImplementedError("Edit predict_proba() in model_loader.py")
