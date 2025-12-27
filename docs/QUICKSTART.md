# ⚡ Guide de Démarrage Rapide

Guide rapide pour tester et déployer l'application avec Docker.

## 🐳 Démarrage local avec Docker

### Prérequis
- Docker Desktop (ou Docker Engine + Docker Compose)

### Étapes

1. **Configurer les fichiers d'environnement** :
```bash
# Backend
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos credentials Firebase

# Frontend
cp frontend/env.example frontend/.env.local
# Éditer frontend/.env.local avec vos credentials Firebase
# IMPORTANT: NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. **Démarrer avec Docker Compose** :

**Mode développement (avec hot reload)** :
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Mode production** :
```bash
docker-compose up --build
```

3. **Accéder à l'application** :
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🚀 Déploiement sur Google Cloud Run

### Prérequis

1. **Google Cloud CLI** installé et configuré
2. **Projet GCP** créé avec facturation activée
3. **APIs activées** :
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

### Configuration initiale

```bash
# Définir le projet
export PROJECT_ID=your-project-id
export REGION=europe-west1  # Changez selon votre région

gcloud config set project $PROJECT_ID

# Activer les APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com

# Configurer les permissions Cloud Build
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Déploiement du Backend

1. **Configurer les variables d'environnement** dans Cloud Run :
```bash
gcloud run services update city-platform-backend \
  --region $REGION \
  --update-env-vars \
    FIREBASE_PROJECT_ID=your-project-id,\
    CORS_ORIGINS=https://city-platform-frontend-xxxxx.run.app,\
    ENVIRONMENT=production
```

2. **Déployer** :
```bash
gcloud builds submit \
  --config=infra/cloudbuild-backend.yaml \
  --substitutions=_REGION=$REGION
```

3. **Récupérer l'URL** :
```bash
BACKEND_URL=$(gcloud run services describe city-platform-backend \
  --region $REGION \
  --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"
```

### Déploiement du Frontend

1. **Configurer les variables d'environnement** :
```bash
gcloud run services update city-platform-frontend \
  --region $REGION \
  --update-env-vars \
    NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key,\
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com,\
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id,\
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com,\
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id,\
    NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id,\
    NEXT_PUBLIC_API_URL=$BACKEND_URL
```

2. **Déployer** :
```bash
gcloud builds submit \
  --config=infra/cloudbuild-frontend.yaml \
  --substitutions=_REGION=$REGION
```

3. **Récupérer l'URL** :
```bash
FRONTEND_URL=$(gcloud run services describe city-platform-frontend \
  --region $REGION \
  --format="value(status.url)")
echo "Frontend URL: $FRONTEND_URL"
```

## 🔧 Configuration Firebase

Avant de démarrer, vous devez configurer Firebase :

1. Créer un projet Firebase dans la [Console Firebase](https://console.firebase.google.com/)
2. Activer Firebase Authentication (Google, Facebook)
3. Activer Firestore
4. Récupérer les credentials :
   - **Frontend** : Configuration web (dans Firebase Console > Project Settings > Your apps)
   - **Backend** : Service Account Key (dans Firebase Console > Project Settings > Service Accounts)

Voir [FIREBASE_SETUP.md](../FIREBASE_SETUP.md) pour plus de détails.

## ✅ Vérification

### Tester le backend localement
```bash
curl http://localhost:8000/health
# Devrait retourner: {"status":"healthy"}
```

### Tester le frontend localement
Ouvrir http://localhost:3000 dans le navigateur et vérifier :
- La page se charge
- La connexion Firebase fonctionne
- Les appels API fonctionnent (ouvrir la console du navigateur)

## 🐛 Problèmes courants

### Port déjà utilisé
```bash
# Trouver et tuer le processus
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
kill -9 <PID>
```

### Erreurs de connexion entre frontend et backend
- Vérifier que `NEXT_PUBLIC_API_URL=http://localhost:8000` dans `.env.local` (local)
- Vérifier que `NEXT_PUBLIC_API_URL` pointe vers l'URL Cloud Run du backend (production)
- Vérifier les CORS dans `backend/.env`: `CORS_ORIGINS=http://localhost:3000` (local)

### Erreurs Docker
```bash
# Nettoyer et reconstruire
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Erreurs de déploiement Cloud Run
- Vérifier les logs : `gcloud run services logs read`
- Vérifier que les variables d'environnement sont correctement configurées
- Vérifier les permissions IAM pour Cloud Build

