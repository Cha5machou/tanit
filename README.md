# 🏛️ City Platform

> Plateforme SaaS pour créer des applications web culturelles interactives

## 🎯 Vision

Permettre à des organisations (offices du tourisme, musées, collectivités, événements) de créer facilement des **applications web culturelles** intégrant :

- 🗺️ Parcours urbains interactifs
- 🤖 Assistant IA configurable
- 🎯 Quiz gamifiés
- 📊 Tracking avancé des usages

**Le tout sans développement spécifique, via une plateforme SaaS.**

## 📁 Structure du projet

```
city-platform/
├── frontend/          # Next.js (Netlify)
├── backend/           # FastAPI (Cloud Run)
├── infra/             # Configuration infrastructure
└── docs/              # Documentation projet
```

## 🏗️ Architecture technique

| Composant | Technologie | Hébergement |
|-----------|-------------|-------------|
| Frontend | Next.js + Tailwind | Netlify |
| Backend | FastAPI | Google Cloud Run |
| Auth | Firebase Authentication | Google Cloud |
| Database | Firestore | Google Cloud |
| Storage | Google Cloud Storage | Google Cloud |
| IA | Gemini Flash / OpenAI | API externes |

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- Python 3.11+
- Compte Google Cloud
- Compte Firebase
- Compte Netlify

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📊 Phases de développement

### Phase 1 — Socle
- [ ] Auth Firebase
- [ ] Next.js + Netlify
- [ ] FastAPI + Cloud Run
- [ ] Firestore

### Phase 2 — Fonctionnel MVP
- [ ] Carte + POI
- [ ] IA texte
- [ ] Tracking

### Phase 3 — Admin
- [ ] CRUD site
- [ ] Config IA
- [ ] Stats simples

## 👥 Personas

1. **Utilisateur final** : Touriste, visiteur, habitant curieux
2. **Admin** : Office du tourisme, musée, collectivité
3. **Super-admin** : Équipe produit/technique

## 📝 Documentation

- [Guide de configuration Firebase](./FIREBASE_SETUP.md) ⭐ **Commencer ici**
- [EPIC 1 - Authentification & Accès](./EPIC1_README.md)
- [Plan de projet complet](./PROJECT_PLAN.md)
- [Architecture détaillée](./docs/architecture.md) (à venir)
- [Modèle de données](./docs/data-model.md) (à venir)
- [API Reference](./docs/api.md) (à venir)

## 📄 Licence

Propriétaire - Tous droits réservés

