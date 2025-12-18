# City Platform Backend

API FastAPI pour la plateforme culturelle.

## Installation

1. Créer un environnement virtuel :
```bash
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

2. Installer les dépendances :
```bash
pip install -r requirements.txt
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Configurer les variables d'environnement Firebase

## Lancer l'API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API sera accessible sur `http://localhost:8000`

## Documentation API

Une fois l'API lancée, accéder à :
- Swagger UI : `http://localhost:8000/docs`
- ReDoc : `http://localhost:8000/redoc`

## Docker

```bash
docker build -t city-platform-backend .
docker run -p 8000:8000 --env-file .env city-platform-backend
```

