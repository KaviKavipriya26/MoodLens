Put your trained BERT-BiLSTM files here.
After you add api/model_loader.py (see api/model_loader_example.py), run:
    python manage.py evaluate_model path/to/test.csv
This creates metrics.json, which the Reports page displays (accuracy, F1, confusion matrix).
