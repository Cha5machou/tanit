# 📋 Plan de Projet - Plateforme Culturelle SaaS

## 📌 1. Vue d'ensemble du projet

### 1.1 Vision
Plateforme SaaS permettant aux organisations (offices du tourisme, musées, collectivités, événements) de créer facilement des applications web culturelles (desktop & mobile) avec :
- 🗺️ Parcours urbains interactifs
- 🤖 Assistant IA configurable
- 🎯 Quiz gamifiés
- 📊 Tracking avancé des usages

### 1.2 Objectifs
- Time-to-market très rapide pour les admins
- Expérience fluide pour les utilisateurs finaux
- Architecture simple, scalable et maîtrisée en coûts
- Forte observabilité (tracking, analytics, IA)

### 1.3 Personas
- **Utilisateur final** : Touriste/visiteur, habitant curieux, étudiant
- **Admin** : Office du tourisme, musée, collectivité, organisateur d'événement
- **Super-admin** : Équipe produit/technique

---

## 🏗️ 2. Architecture technique

### 2.1 Stack technique

#### Frontend
- **Framework** : Next.js (App Router)
- **Déploiement** : Netlify
- **Styling** : Tailwind CSS
- **Auth SDK** : Firebase SDK côté client

#### Backend
- **Framework** : FastAPI
- **Containerisation** : Docker
- **Déploiement** : Google Cloud Run
- **CI/CD** : Google Cloud Build

#### Authentification
- **Service** : Firebase Authentication
- **Providers** : Google, Facebook
- **Token** : JWT transmis au backend

#### Base de données
- **Principal** : Firestore
- **Raison** : Parfait pour tracking d'événements, données semi-structurées, multi-tenant simple, zéro ops, scaling automatique

#### Storage
- **Service** : Google Cloud Storage
- **Usage** : Documents IA, images, audio (plus tard)

#### IA
- **LLM** : Gemini Flash ou OpenAI
- **Approche** : RAG en mémoire (sans vector DB)
- **Pipeline** : Upload → Extraction → Chunking → Embeddings → Retriever MMR → LLM

---

## 📁 3. Structure du projet

```
city-platform/
├── frontend/                 # Application Next.js
│   ├── public/
│   │   ├── images/
│   │   └── icons/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx      # Landing / Home
│   │   │   ├── login/
│   │   │   ├── onboarding/
│   │   │   ├── map/
│   │   │   ├── ai/
│   │   │   ├── quiz/
│   │   │   └── admin/
│   │   ├── components/
│   │   │   ├── ui/           # Buttons, Modal, Input
│   │   │   ├── map/
│   │   │   ├── chat/
│   │   │   └── admin/
│   │   ├── services/
│   │   │   ├── api.ts        # Appels API backend
│   │   │   ├── auth.ts       # Firebase Auth
│   │   │   └── tracking.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSite.ts
│   │   │   └── useTracking.ts
│   │   ├── lib/
│   │   │   ├── firebase.ts
│   │   │   └── constants.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── .env.example
│   ├── netlify.toml
│   ├── package.json
│   └── README.md
│
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── core/
│   │   │   ├── config.py     # env, settings
│   │   │   ├── security.py   # Firebase JWT verification
│   │   │   └── logging.py
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py
│   │   │   │   ├── sites.py
│   │   │   │   ├── poi.py
│   │   │   │   ├── ai.py
│   │   │   │   ├── quiz.py
│   │   │   │   └── tracking.py
│   │   │   └── deps.py       # dependencies (auth, site)
│   │   ├── services/
│   │   │   ├── firestore.py
│   │   │   ├── storage.py    # GCS
│   │   │   ├── llm.py        # OpenAI / Gemini
│   │   │   ├── ai_pipeline.py # chunk / embed / retrieve
│   │   │   └── tracking.py
│   │   ├── models/
│   │   │   ├── site.py
│   │   │   ├── user.py
│   │   │   ├── ai.py
│   │   │   └── quiz.py
│   │   ├── schemas/
│   │   │   ├── site.py
│   │   │   ├── ai.py
│   │   │   └── quiz.py
│   │   └── utils/
│   │       └── helpers.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── infra/                    # Infrastructure as Code
│   ├── cloudbuild.yaml
│   ├── cloudrun/
│   │   └── service.yaml
│   └── firebase/
│       └── auth.md
│
├── docs/                     # Documentation
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
│
├── .gitignore
└── README.md
```

---

## 🗄️ 4. Modèle de données Firestore

### 4.1 Collections principales

#### `users/{userId}`
```json
{
  "role": "user" | "admin" | "super-admin",
  "siteId": "site_123",
  "createdAt": "timestamp"
}
```

#### `profiles/{userId}`
```json
{
  "age": "number",
  "sexe": "string",
  "metier": "string",
  "raisonVisite": "string"
}
```

#### `sites/{siteId}`
```json
{
  "name": "string",
  "city": "string",
  "adminId": "string",
  "createdAt": "timestamp"
}
```

#### `sites/{siteId}/poi/{poiId}`
```json
{
  "name": "string",
  "lat": "number",
  "lng": "number",
  "description": "string"
}
```

#### `sites/{siteId}/ai_config/main`
```json
{
  "systemPrompt": "string",
  "temperature": "number"
}
```

#### `sites/{siteId}/ai_logs/{logId}`
```json
{
  "userId": "string",
  "question": "string",
  "answer": "string",
  "liked": "boolean",
  "createdAt": "timestamp"
}
```

#### `sites/{siteId}/events/{eventId}`
```json
{
  "userId": "string",
  "type": "string",
  "metadata": "object",
  "createdAt": "timestamp"
}
```

---

## 🎯 5. Épics et Features

### EPIC 1 : Authentification & accès

#### Features
- [ ] Login Google / Facebook via Firebase Auth
- [ ] Gestion des rôles (user / admin / super-admin)
- [ ] Profil utilisateur enrichi (onboarding)
- [ ] Sécurisation des routes (middleware auth)
- [ ] Logout

#### User Stories
- En tant qu'utilisateur, je veux me connecter avec Google afin d'accéder rapidement au site
- En tant qu'admin, je veux accéder à mon dashboard d'administration

---

### EPIC 2 : Carte & parcours

#### Features
- [ ] Carte interactive de la ville (Leaflet/Mapbox)
- [ ] Points d'intérêt (POI) cliquables
- [ ] Parcours simple / moyen / complet
- [ ] Détails texte pour chaque POI
- [ ] Calcul d'itinéraire simple

#### User Stories
- En tant qu'utilisateur, je veux voir une carte avec des points d'intérêt afin de suivre un parcours culturel
- En tant qu'utilisateur, je veux voir les détails d'un point d'intérêt en cliquant dessus

---

### EPIC 3 : Assistant IA

#### Features
- [ ] Chat texte avec l'IA
- [ ] Prompt configurable par admin
- [ ] Suggestions de questions
- [ ] Historique des conversations
- [ ] Feedback utilisateur (like / dislike)
- [ ] Upload de documents pour contexte IA

#### User Stories
- En tant qu'utilisateur, je veux poser une question à l'IA afin d'obtenir une réponse sur la ville
- En tant qu'admin, je veux configurer le prompt de l'IA afin d'adapter les réponses aux visiteurs

---

### EPIC 4 : Quiz

#### Features
- [ ] Création de quiz par admin
- [ ] Réponses utilisateur
- [ ] Score final
- [ ] Classement simple

#### User Stories
- En tant qu'utilisateur, je veux répondre à un quiz afin de tester mes connaissances
- En tant qu'admin, je veux créer des quiz pour engager les visiteurs

---

### EPIC 5 : Tracking & analytics

#### Features
- [ ] Tracking des sessions
- [ ] Funnel de navigation
- [ ] Événements IA (questions, réponses, feedback)
- [ ] Résultats quiz
- [ ] Dashboard analytics pour admin

#### Événements trackés
- `login`
- `logout`
- `start_session`
- `end_session`
- `open_map`
- `open_ai`
- `ai_question`
- `ai_like`
- `quiz_start`
- `quiz_end`

---

### EPIC 6 : Administration

#### Features
- [ ] Gestion des sites (CRUD)
- [ ] Configuration IA (prompt, température)
- [ ] Gestion des contenus carte (POI)
- [ ] Statistiques d'utilisation
- [ ] Upload de documents pour contexte IA

#### User Stories
- En tant qu'admin, je veux créer et modifier un site facilement
- En tant qu'admin, je veux voir les statistiques d'utilisation afin de mesurer l'impact de mon site

---

## 🚀 6. Plan de développement par phases

### Phase 1 : Socle technique (Semaine 1-2)

#### Backend
- [ ] Setup FastAPI avec structure de base
- [ ] Configuration Firebase Admin SDK
- [ ] Middleware de vérification JWT Firebase
- [ ] Configuration Firestore
- [ ] Configuration Google Cloud Storage
- [ ] Dockerfile et configuration Cloud Run
- [ ] CI/CD avec Cloud Build

#### Frontend
- [ ] Setup Next.js avec App Router
- [ ] Configuration Tailwind CSS
- [ ] Configuration Firebase SDK client
- [ ] Service d'authentification
- [ ] Configuration Netlify
- [ ] Layout de base et navigation

#### Infrastructure
- [ ] Création projet GCP
- [ ] Configuration Firebase Auth (Google, Facebook)
- [ ] Configuration Firestore
- [ ] Configuration Cloud Storage
- [ ] Configuration Cloud Run
- [ ] Configuration Cloud Build

---

### Phase 2 : Fonctionnel MVP (Semaine 3-5)

#### Authentification
- [ ] Page de login avec Google/Facebook
- [ ] Onboarding profil utilisateur
- [ ] Gestion des rôles
- [ ] Protection des routes

#### Carte & POI
- [ ] Intégration carte (Leaflet/Mapbox)
- [ ] API CRUD POI
- [ ] Affichage POI sur carte
- [ ] Détails POI (modal/page)
- [ ] Calcul d'itinéraire simple

#### Assistant IA
- [ ] Pipeline IA (extraction, chunking, embeddings)
- [ ] Service LLM (Gemini/OpenAI)
- [ ] API chat IA
- [ ] Interface chat frontend
- [ ] Historique des conversations
- [ ] Feedback like/dislike

#### Tracking
- [ ] Service de tracking côté backend
- [ ] Service de tracking côté frontend
- [ ] Enregistrement événements Firestore
- [ ] Événements de base (login, map, ai)

---

### Phase 3 : Administration (Semaine 6-7)

#### Dashboard Admin
- [ ] Layout admin
- [ ] Liste des sites
- [ ] CRUD site
- [ ] Configuration IA (prompt, température)
- [ ] Upload documents pour contexte IA
- [ ] Gestion POI
- [ ] Statistiques d'utilisation

#### Quiz (MVP)
- [ ] Modèle de données quiz
- [ ] API CRUD quiz
- [ ] Interface création quiz
- [ ] Interface réponse quiz
- [ ] Calcul score

---

### Phase 4 : Améliorations & Polish (Semaine 8)

- [ ] Optimisations performance
- [ ] Gestion d'erreurs
- [ ] Tests unitaires critiques
- [ ] Documentation API
- [ ] Guide de déploiement
- [ ] README complet

---

## 🔌 7. APIs Backend (FastAPI)

### 7.1 Routes principales

#### `/api/auth`
- `GET /me` - Récupérer utilisateur courant
- `POST /onboarding` - Compléter profil

#### `/api/sites`
- `GET /` - Liste des sites (admin/super-admin)
- `POST /` - Créer un site (admin)
- `GET /{siteId}` - Détails d'un site
- `PUT /{siteId}` - Modifier un site (admin)
- `DELETE /{siteId}` - Supprimer un site (admin)

#### `/api/poi`
- `GET /{siteId}/poi` - Liste des POI d'un site
- `POST /{siteId}/poi` - Créer un POI (admin)
- `GET /{siteId}/poi/{poiId}` - Détails d'un POI
- `PUT /{siteId}/poi/{poiId}` - Modifier un POI (admin)
- `DELETE /{siteId}/poi/{poiId}` - Supprimer un POI (admin)

#### `/api/ai`
- `POST /{siteId}/query` - Poser une question à l'IA
- `GET /{siteId}/history` - Historique des conversations
- `POST /{siteId}/feedback` - Feedback like/dislike
- `GET /{siteId}/config` - Configuration IA (admin)
- `PUT /{siteId}/config` - Modifier configuration IA (admin)
- `POST /{siteId}/documents` - Upload document pour contexte (admin)

#### `/api/quiz`
- `GET /{siteId}/quiz` - Liste des quiz
- `POST /{siteId}/quiz` - Créer un quiz (admin)
- `GET /{siteId}/quiz/{quizId}` - Détails d'un quiz
- `POST /{siteId}/quiz/{quizId}/answer` - Répondre à un quiz
- `GET /{siteId}/quiz/{quizId}/results` - Résultats d'un quiz

#### `/api/tracking`
- `POST /{siteId}/events` - Enregistrer un événement
- `GET /{siteId}/stats` - Statistiques (admin)

---

## 🎨 8. Composants Frontend

### 8.1 Pages (App Router)

#### `/` - Landing page
- Présentation de la plateforme
- CTA vers login

#### `/login` - Authentification
- Boutons login Google/Facebook
- Redirection après login

#### `/onboarding` - Profil utilisateur
- Formulaire profil (âge, sexe, métier, raison visite)
- Sauvegarde profil

#### `/map` - Carte interactive
- Carte avec POI
- Liste des POI
- Détails POI

#### `/ai` - Assistant IA
- Interface chat
- Historique
- Suggestions de questions

#### `/quiz` - Quiz
- Liste des quiz disponibles
- Interface de réponse
- Résultats

#### `/admin/*` - Dashboard admin
- `/admin/sites` - Gestion sites
- `/admin/ai-config` - Configuration IA
- `/admin/poi` - Gestion POI
- `/admin/stats` - Statistiques

---

### 8.2 Composants réutilisables

#### UI Components
- `Button` - Bouton stylisé
- `Input` - Champ de saisie
- `Modal` - Modal dialog
- `Card` - Carte de contenu
- `Loading` - Indicateur de chargement

#### Map Components
- `MapView` - Carte principale
- `POIMarker` - Marqueur POI
- `POIDetails` - Détails POI
- `RouteCalculator` - Calcul d'itinéraire

#### Chat Components
- `ChatInterface` - Interface chat complète
- `Message` - Message individuel
- `QuestionSuggestions` - Suggestions de questions
- `FeedbackButtons` - Boutons like/dislike

#### Admin Components
- `SiteForm` - Formulaire création/modification site
- `AIConfigForm` - Formulaire configuration IA
- `POIForm` - Formulaire POI
- `StatsDashboard` - Dashboard statistiques

---

## 🔐 9. Sécurité

### 9.1 Authentification
- Vérification JWT Firebase côté backend
- Middleware d'authentification sur toutes les routes protégées
- Gestion des rôles (user, admin, super-admin)

### 9.2 Autorisation
- Vérification des permissions par route
- Admin peut uniquement modifier son site
- Super-admin peut tout modifier

### 9.3 Sécurité API
- Rate limiting
- Validation des inputs (Pydantic)
- CORS configuré correctement
- Variables d'environnement pour secrets

---

## 📊 10. Tracking & Analytics

### 10.1 Événements trackés

#### Authentification
- `login` - Connexion utilisateur
- `logout` - Déconnexion utilisateur

#### Session
- `start_session` - Début de session
- `end_session` - Fin de session

#### Navigation
- `open_map` - Ouverture de la carte
- `open_ai` - Ouverture du chat IA
- `open_quiz` - Ouverture d'un quiz

#### IA
- `ai_question` - Question posée à l'IA
- `ai_answer` - Réponse reçue
- `ai_like` - Feedback positif
- `ai_dislike` - Feedback négatif

#### Quiz
- `quiz_start` - Début d'un quiz
- `quiz_end` - Fin d'un quiz
- `quiz_answer` - Réponse à une question

### 10.2 Stockage
- Firestore collection `events`
- Exportable vers BigQuery (plus tard)

---

## 🤖 11. Pipeline IA

### 11.1 Flux de traitement

1. **Upload documents** (admin) → Google Cloud Storage
2. **Extraction texte** → Extraction depuis documents (PDF, TXT, etc.)
3. **Chunking** → Découpage en chunks (en mémoire)
4. **Embeddings** → Génération embeddings (en mémoire)
5. **Retriever MMR** → Recherche de chunks pertinents (en mémoire)
6. **Appel LLM** → Génération réponse (Gemini Flash ou OpenAI)
7. **Réponse utilisateur** → Retour de la réponse
8. **Log** → Enregistrement question/réponse dans Firestore
9. **Feedback** → Enregistrement feedback utilisateur

### 11.2 Configuration
- Prompt système configurable par admin
- Température configurable
- Documents de contexte uploadables par admin

---

## 🚫 12. Hors scope (pour l'instant)

- ❌ Vector DB (persistance embeddings)
- ❌ Audio / transcription
- ❌ Streaming IA
- ❌ Quiz avancé (multiples tentatives, classements complexes)
- ❌ Billing / paiement
- ❌ Multi-langues
- ❌ Notifications push

---

## 📝 13. Checklist de démarrage

### Environnement de développement
- [ ] Node.js installé
- [ ] Python 3.11+ installé
- [ ] Docker installé
- [ ] Compte GCP créé
- [ ] Compte Netlify créé
- [ ] Compte Firebase créé

### Configuration GCP
- [ ] Projet GCP créé
- [ ] Billing activé
- [ ] APIs activées (Cloud Run, Cloud Build, Firestore, Storage)
- [ ] Service account créé
- [ ] Clés de service account téléchargées

### Configuration Firebase
- [ ] Projet Firebase créé
- [ ] Authentication activée (Google, Facebook)
- [ ] Firestore activé
- [ ] Règles Firestore configurées

### Configuration Netlify
- [ ] Site Netlify créé
- [ ] Variables d'environnement configurées
- [ ] Build settings configurées

---

## 📚 14. Documentation à créer

- [ ] `README.md` - Vue d'ensemble du projet
- [ ] `docs/architecture.md` - Architecture détaillée
- [ ] `docs/api.md` - Documentation API complète
- [ ] `docs/deployment.md` - Guide de déploiement
- [ ] `docs/development.md` - Guide de développement
- [ ] `docs/tracking.md` - Guide du système de tracking

---

## 🎯 15. Métriques de succès

### Technique
- Temps de réponse API < 500ms
- Disponibilité > 99%
- Temps de build < 5 min

### Produit
- Taux de conversion login > 60%
- Taux d'engagement IA > 40%
- Taux de complétion quiz > 30%

---

## 📅 16. Timeline estimée

- **Semaine 1-2** : Phase 1 - Socle technique
- **Semaine 3-5** : Phase 2 - Fonctionnel MVP
- **Semaine 6-7** : Phase 3 - Administration
- **Semaine 8** : Phase 4 - Améliorations & Polish

**Total estimé : 8 semaines pour MVP**

---

## 🔄 17. Prochaines étapes

1. Valider le plan avec l'équipe
2. Créer le repository Git
3. Initialiser les projets (frontend, backend)
4. Configurer les environnements (GCP, Firebase, Netlify)
5. Démarrer Phase 1 - Socle technique

---

*Dernière mise à jour : [Date]*

