# EPIC 1 : Authentification & Accès - Documentation

## ✅ Fonctionnalités implémentées

### Backend (FastAPI)

1. **Configuration Firebase Admin SDK**
   - Initialisation Firebase Admin dans `app/core/security.py`
   - Support des credentials via fichier JSON ou variables d'environnement
   - Vérification des tokens JWT Firebase

2. **Routes d'authentification** (`/api/v1/auth`)
   - `GET /me` - Récupérer les informations de l'utilisateur courant
   - `POST /onboarding` - Créer ou mettre à jour le profil utilisateur
   - `GET /profile` - Récupérer le profil utilisateur

3. **Gestion des rôles**
   - Support des rôles : `user`, `admin`, `super-admin`
   - Dépendances pour vérifier les rôles (`app/api/deps.py`)
   - Création automatique de l'utilisateur dans Firestore à la première connexion

4. **Service Firestore**
   - CRUD utilisateurs (`users` collection)
   - CRUD profils (`profiles` collection)
   - Gestion des timestamps automatiques

### Frontend (Next.js)

1. **Configuration Firebase Client**
   - Initialisation Firebase dans `src/lib/firebase.ts`
   - Configuration via variables d'environnement

2. **Services d'authentification**
   - `signInWithGoogle()` - Connexion avec Google
   - `signInWithFacebook()` - Connexion avec Facebook
   - `signOut()` - Déconnexion
   - `getIdToken()` - Récupération du token JWT

3. **Hooks React**
   - `useAuth()` - Gestion de l'état d'authentification
   - `useRole()` - Vérification des rôles utilisateur

4. **Composants de protection**
   - `AuthGuard` - Protection des routes nécessitant une authentification
   - `RoleGuard` - Protection des routes nécessitant un rôle spécifique

5. **Pages**
   - `/login` - Page de connexion avec Google/Facebook
   - `/onboarding` - Formulaire de création de profil
   - `/admin` - Dashboard admin (protégé par RoleGuard)

6. **Composants UI**
   - `Button` - Bouton réutilisable avec variants et loading
   - `Input` - Champ de saisie avec label et gestion d'erreur
   - `Select` - Liste déroulante avec options

## 📁 Structure des fichiers

### Backend
```
backend/
├── app/
│   ├── main.py                 # Application FastAPI principale
│   ├── core/
│   │   ├── config.py           # Configuration (env vars)
│   │   ├── security.py         # Firebase Admin + JWT verification
│   │   └── logging.py          # Configuration logging
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py         # Routes authentification
│   │   │   └── sites.py        # Routes sites (placeholder)
│   │   └── deps.py             # Dépendances (auth, roles)
│   ├── services/
│   │   └── firestore.py        # Service Firestore
│   ├── models/
│   │   └── user.py             # Modèles User et Profile
│   ├── schemas/
│   │   └── user.py             # Schémas Pydantic pour API
│   └── utils/
│       └── helpers.py          # Fonctions utilitaires
├── requirements.txt
├── Dockerfile
└── README.md
```

### Frontend
```
frontend/src/
├── app/
│   ├── layout.tsx              # Layout principal
│   ├── page.tsx                # Page d'accueil
│   ├── login/
│   │   └── page.tsx           # Page de connexion
│   ├── onboarding/
│   │   └── page.tsx           # Page de création de profil
│   └── admin/
│       └── page.tsx           # Dashboard admin
├── components/
│   ├── AuthGuard.tsx          # Protection authentification
│   ├── RoleGuard.tsx          # Protection par rôle
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── hooks/
│   ├── useAuth.ts             # Hook authentification
│   └── useRole.ts             # Hook gestion rôles
├── services/
│   ├── auth.ts                # Services Firebase Auth
│   └── api.ts                 # Client API backend
├── lib/
│   ├── firebase.ts            # Configuration Firebase
│   └── constants.ts           # Constantes
├── types/
│   └── index.ts               # Types TypeScript
├── middleware.ts              # Middleware Next.js
└── styles/
    └── globals.css            # Styles globaux Tailwind
```

## 🔧 Configuration requise

### Variables d'environnement Backend (`.env`)

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# Ou utiliser un fichier JSON
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/serviceAccountKey.json

# API Settings
CORS_ORIGINS=http://localhost:3000,https://your-netlify-site.netlify.app
ENVIRONMENT=development
```

### Variables d'environnement Frontend (`.env.local`)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🚀 Démarrage

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📝 Modèle de données Firestore

### Collection `users/{userId}`
```json
{
  "role": "user" | "admin" | "super-admin",
  "site_id": "site_123",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Collection `profiles/{userId}`
```json
{
  "user_id": "user_123",
  "age": 30,
  "sexe": "homme",
  "metier": "Développeur",
  "raison_visite": "tourisme",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## 🔐 Flux d'authentification

1. **Connexion**
   - Utilisateur clique sur "Continuer avec Google/Facebook"
   - Firebase Auth gère la popup de connexion
   - Token JWT récupéré et stocké côté client

2. **Vérification backend**
   - Chaque requête API inclut le token dans le header `Authorization: Bearer <token>`
   - Backend vérifie le token avec Firebase Admin SDK
   - Utilisateur créé automatiquement dans Firestore si inexistant

3. **Onboarding**
   - Après connexion, redirection vers `/onboarding`
   - Formulaire pour compléter le profil
   - Profil sauvegardé dans Firestore

4. **Protection des routes**
   - `AuthGuard` vérifie l'authentification
   - `RoleGuard` vérifie le rôle requis
   - Redirection automatique vers `/login` si non authentifié

## ✅ Tests à effectuer

- [ ] Connexion avec Google
- [ ] Connexion avec Facebook
- [ ] Création automatique utilisateur dans Firestore
- [ ] Création de profil via onboarding
- [ ] Protection des routes avec AuthGuard
- [ ] Protection des routes admin avec RoleGuard
- [ ] Déconnexion
- [ ] Vérification des tokens JWT côté backend

## 🐛 Problèmes connus / À améliorer

- Gestion d'erreurs plus fine côté frontend
- Refresh automatique des tokens expirés
- Meilleure gestion des états de chargement
- Tests unitaires et d'intégration

