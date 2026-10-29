"""Data is stored in MongoDB Atlas via pymongo (see db.py), so there are no Django ORM models.

Collections
  users     {email (unique), name, password (hashed), created}
  analyses  {user_id, text, label, conf, sev, pol, p, emo, emojis, slang, words, crisis, date, created}
  moods     {user_id, mood (1-5), note, date, analysis{label,conf,sev,p,crisis}|None, created}
"""
