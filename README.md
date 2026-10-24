# MindScan (Frontend + Django Backend)

## Backend
cd backend
python -m venv venv
venv\Scripts\activate          (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
python manage.py makemigrations api
python manage.py migrate
python manage.py runserver     -> http://127.0.0.1:8000

## Frontend (new terminal)
cd frontend
npm install
npm run dev                    -> open http://localhost:5500

Database: SQLite by default. For MySQL: pip install mysqlclient, then set USE_MYSQL=1, DB_NAME, DB_USER, DB_PASS, DB_HOST.
BERT-BiLSTM: edit predict_prob() in backend/api/ml.py.
