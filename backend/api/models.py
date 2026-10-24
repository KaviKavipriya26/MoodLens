from django.db import models
from django.contrib.auth.models import User

class Analysis(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    label = models.CharField(max_length=20)   # Depressed / Non-Depressed
    conf = models.IntegerField()
    sev = models.CharField(max_length=10)     # Low / Moderate / High
    pol = models.FloatField()
    emo = models.JSONField()
    emojis = models.JSONField(default=list)
    slang = models.JSONField(default=list)
    words = models.JSONField(default=list)
    created = models.DateTimeField(auto_now_add=True)

class MoodEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mood = models.IntegerField()              # 1-5
    note = models.TextField(blank=True)
    date = models.DateField()
