# 🖥️ City Platform - Frontend

Application Next.js pour la plateforme culturelle.

## 🛠️ Stack technique

- **Framework** : Next.js 14 (App Router)
- **Styling** : Tailwind CSS
- **Auth** : Firebase Authentication
- **State** : Zustand
- **Maps** : Leaflet / React-Leaflet
- **Déploiement** : Google Cloud Run

## 📁 Structure

```
src/
├── app/                  # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx          # Landing / Home
│   ├── login/
│   ├── onboarding/
│   ├── map/
│   ├── ai/
│   ├── quiz/
│   └── admin/
│
├── components/
│   ├── ui/               # Buttons, Modal, Input
│   ├── map/
│   ├── chat/
│   └── admin/
│
├── services/
│   ├── api.ts            # Appels API backend
│   ├── auth.ts           # Firebase Auth
│   └── tracking.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useSite.ts
│   └── useTracking.ts
│
├── lib/
│   ├── firebase.ts
│   └── constants.ts
│
├── types/
│   └── index.ts
│
└── styles/
    └── globals.css
```

## 🚀 Démarrage avec Docker

### Développement local

1. **Configurer les variables d'environnement** :
```bash
cp env.example .env.local
# Éditer .env.local avec vos credentials Firebase
# IMPORTANT: NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. **Démarrer avec Docker Compose** :
```bash
# Depuis la racine du projet
docker-compose -f docker-compose.dev.yml up --build
```

Le frontend sera accessible sur http://localhost:3000 avec hot reload activé.

### Build de production

```bash
# Build avec Docker
docker build -t city-platform-frontend .

# Ou avec Docker Compose
docker-compose up --build
```

## 🔧 Variables d'environnement

Créer un fichier `.env.local` avec :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=http://localhost:8000  # URL du backend
```

Voir `env.example` pour la liste complète.

## 📦 Scripts disponibles

```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run start    # Serveur de production
npm run lint     # Linter
```

## 🚀 Déploiement sur Cloud Run

Voir [docs/QUICKSTART.md](../docs/QUICKSTART.md) pour le guide complet.

**Résumé** :
```bash
gcloud builds submit \
  --config=../infra/cloudbuild-frontend.yaml \
  --substitutions=_REGION=europe-west1
```
