# City Platform Backend

API FastAPI pour la plateforme culturelle.

## 🛠️ Stack technique

- **Framework** : FastAPI
- **Language** : Python 3.11+
- **Auth** : Firebase Admin SDK
- **Database** : Firestore
- **Storage** : Google Cloud Storage
- **Déploiement** : Google Cloud Run

## 📁 Structure

```
app/
├── main.py           # Application FastAPI principale
├── core/
│   ├── config.py     # Configuration (env vars)
│   ├── security.py   # Firebase Admin + JWT verification
│   └── logging.py    # Configuration logging
├── api/
│   ├── routes/       # Routes API
│   │   └── auth.py
│   └── deps.py       # Dépendances (auth, roles)
├── services/
│   └── firestore.py  # Service Firestore
├── models/           # Modèles de données
└── schemas/          # Schémas Pydantic pour API
```

## 🚀 Démarrage avec Docker

### Développement local

1. **Configurer les variables d'environnement** :
```bash
cp .env.example .env
# Éditer .env avec vos credentials Firebase
```

2. **Démarrer avec Docker Compose** :
```bash
# Depuis la racine du projet
docker-compose -f docker-compose.dev.yml up --build
```

L'API sera accessible sur http://localhost:8000 avec hot reload activé.

### Build de production

```bash
# Build avec Docker
docker build -t city-platform-backend .

# Ou avec Docker Compose
docker-compose up --build
```

## 🔧 Variables d'environnement

Créer un fichier `.env` avec :

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# API Settings
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name

# OpenAI (pour l'agent IA)
OPENAI_API_KEY=sk-...

# Google Gemini (pour l'agent IA)
GOOGLE_API_KEY=...

```

Voir la documentation complète dans `docs/AI_AGENT_CONFIG.md` pour plus de détails sur la configuration de l'agent IA.

## 📚 Documentation API

Une fois l'API lancée, accéder à :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

## ✅ Health Check

```bash
curl http://localhost:8000/health
# Devrait retourner: {"status":"healthy"}
```

## 🚀 Déploiement sur Cloud Run

Voir [docs/QUICKSTART.md](../docs/QUICKSTART.md) pour le guide complet.

**Résumé** :
```bash
gcloud builds submit \
  --config=../infra/cloudbuild-backend.yaml \
  --substitutions=_REGION=europe-west1
```
