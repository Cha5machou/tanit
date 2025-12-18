# 🖥️ City Platform - Frontend

Application Next.js pour la plateforme culturelle.

## 🛠️ Stack technique

- **Framework** : Next.js 14 (App Router)
- **Styling** : Tailwind CSS
- **Auth** : Firebase Authentication
- **State** : Zustand
- **Maps** : Leaflet / React-Leaflet
- **Déploiement** : Netlify

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

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local

# Lancer le serveur de développement
npm run dev
```

## 🔧 Variables d'environnement

Voir `.env.example` pour la liste complète.

## 📦 Build

```bash
npm run build
```

## 🧪 Lint

```bash
npm run lint
```

