# 🏛️ City Platform

> Plateforme SaaS pour créer des applications web culturelles interactives

## 🎯 Objectif

City Platform est une plateforme SaaS permettant aux organisations (offices du tourisme, musées, collectivités, événements) de créer facilement des **applications web culturelles** intégrant :

- 🗺️ Parcours urbains interactifs
- 🤖 Assistant IA configurable
- 🎯 Quiz gamifiés
- 📊 Tracking avancé des usages

**Le tout sans développement spécifique, via une plateforme SaaS.**

## 📁 Structure du projet

```
city-platform/
├── frontend/          # Application Next.js
│   ├── src/          # Code source
│   ├── Dockerfile    # Image Docker pour Cloud Run
│   └── README.md     # Documentation frontend
│
├── backend/           # API FastAPI
│   ├── app/          # Code source
│   ├── Dockerfile    # Image Docker pour Cloud Run
│   └── README.md     # Documentation backend
│
├── infra/             # Configuration infrastructure
│   ├── cloudbuild-*.yaml    # Configurations Cloud Build
│   └── cloudrun/            # Configurations Cloud Run
│
├── scripts/           # Scripts utilitaires
│   └── start-docker.sh     # Script de démarrage Docker
│
├── docs/              # Documentation
│   └── QUICKSTART.md       # Guide de démarrage rapide
│
├── docker-compose.yml       # Docker Compose (production)
└── docker-compose.dev.yml   # Docker Compose (développement)
```

## 🏗️ Architecture technique

| Composant | Technologie | Hébergement |
|-----------|-------------|-------------|
| Frontend | Next.js + Tailwind | Google Cloud Run |
| Backend | FastAPI | Google Cloud Run |
| Auth | Firebase Authentication | Google Cloud |
| Database | Firestore | Google Cloud |
| Storage | Google Cloud Storage | Google Cloud |
| IA | Gemini Flash / OpenAI | API externes |

## 🚀 Déploiement avec Docker

### Prérequis

- Docker Desktop (ou Docker Engine + Docker Compose)
- Compte Google Cloud (pour le déploiement en production)
- Compte Firebase (pour l'authentification)

### Démarrage local

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

### Déploiement sur Google Cloud Run

Voir [docs/QUICKSTART.md](./docs/QUICKSTART.md) pour le guide complet de déploiement.

**Résumé rapide** :
```bash
# Backend
gcloud builds submit --config=infra/cloudbuild-backend.yaml --substitutions=_REGION=europe-west1

# Frontend
gcloud builds submit --config=infra/cloudbuild-frontend.yaml --substitutions=_REGION=europe-west1
```

## 📚 Documentation

- [Guide de démarrage rapide](./docs/QUICKSTART.md) ⚡ **Commencer ici**
- [Configuration Firebase](./FIREBASE_SETUP.md) 🔥
- [Documentation Frontend](./frontend/README.md)
- [Documentation Backend](./backend/README.md)

## 📄 Licence

Propriétaire - Tous droits réservés
