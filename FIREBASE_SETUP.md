# 🔥 Guide de Configuration Firebase

## Services Firebase nécessaires pour EPIC 1

Pour que l'authentification fonctionne, vous devez activer et configurer les services suivants :

### ✅ 1. Firebase Authentication
### ✅ 2. Cloud Firestore
### ✅ 3. Firebase Admin SDK (pour le backend)

---

## 📋 Étapes de configuration

### Étape 1 : Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"** ou **"Create a project"**
3. Entrez le nom du projet (ex: `city-platform`)
4. Désactivez Google Analytics (optionnel pour le MVP)
5. Cliquez sur **"Créer le projet"**

---

### Étape 2 : Activer Firebase Authentication

1. Dans la console Firebase, allez dans **Authentication** (menu gauche)
2. Cliquez sur **"Commencer"** ou **"Get started"**
3. Allez dans l'onglet **"Sign-in method"** ou **"Méthodes de connexion"**

#### Activer Google Sign-In
1. Cliquez sur **"Google"**
2. Activez le toggle **"Enable"**
3. Sélectionnez un **Email de support** (votre email)
4. Cliquez sur **"Enregistrer"** ou **"Save"**

#### Activer Facebook Sign-In
1. Cliquez sur **"Facebook"**
2. Activez le toggle **"Enable"**
3. Vous aurez besoin d'un **App ID** et **App Secret** depuis [Facebook Developers](https://developers.facebook.com/)
   - Créez une app Facebook si vous n'en avez pas
   - Ajoutez "Facebook Login" comme produit
   - Récupérez l'App ID et App Secret
4. Entrez l'**App ID** et **App Secret**
5. Copiez l'**OAuth Redirect URI** de Firebase
6. Ajoutez cette URI dans les paramètres Facebook (Settings > Basic > Add Platform > Website)
7. Cliquez sur **"Enregistrer"** ou **"Save"**

---

### Étape 3 : Activer Cloud Firestore

1. Dans la console Firebase, allez dans **Firestore Database** (menu gauche)
2. Cliquez sur **"Créer une base de données"** ou **"Create database"**
3. Choisissez le mode :
   - **Mode production** (recommandé) - Règles strictes
   - **Mode test** - Accès libre pendant 30 jours (pour développement)
4. Sélectionnez une **région** (ex: `europe-west` pour l'Europe)
5. Cliquez sur **"Activer"** ou **"Enable"**

#### Configurer les règles Firestore (Mode production)

Allez dans l'onglet **"Règles"** ou **"Rules"** et utilisez ces règles pour le développement :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profiles collection
    match /profiles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Sites collection (pour plus tard)
    match /sites/{siteId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

⚠️ **Note** : Ces règles sont permissives pour le développement. Pour la production, vous devrez les renforcer selon vos besoins de sécurité.

---

### Étape 4 : Configurer Firebase Admin SDK (Backend)

#### Option A : Utiliser un fichier JSON (Recommandé pour développement)

1. Dans la console Firebase, cliquez sur l'icône ⚙️ (Settings) > **"Paramètres du projet"** ou **"Project settings"**
2. Allez dans l'onglet **"Comptes de service"** ou **"Service accounts"**
3. Cliquez sur **"Générer une nouvelle clé privée"** ou **"Generate new private key"**
4. Un fichier JSON sera téléchargé (ex: `city-platform-firebase-adminsdk-xxxxx.json`)
5. **IMPORTANT** : Ne commitez JAMAIS ce fichier dans Git !
6. Placez ce fichier dans le dossier `backend/` et ajoutez-le au `.gitignore`

#### Option B : Utiliser des variables d'environnement

Si vous préférez utiliser des variables d'environnement, vous devrez extraire les valeurs du fichier JSON :

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

---

### Étape 5 : Configurer l'application Web (Frontend)

1. Dans la console Firebase, allez dans **⚙️ Settings > Project settings**
2. Faites défiler jusqu'à **"Vos applications"** ou **"Your apps"**
3. Cliquez sur l'icône **`</>`** (Web) pour ajouter une application web
4. Entrez un nom d'app (ex: `City Platform Web`)
5. **Ne cochez PAS** "Also set up Firebase Hosting" (on utilise Netlify)
6. Cliquez sur **"Enregistrer l'application"** ou **"Register app"**
7. Vous verrez la configuration Firebase avec vos clés API

Copiez ces valeurs dans votre fichier `.env.local` du frontend :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 🔧 Configuration des fichiers

### Backend `.env`

#### Option A : Avec fichier JSON
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./city-platform-firebase-adminsdk-xxxxx.json
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

#### Option B : Avec variables d'environnement
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ✅ Checklist de vérification

Avant de tester, vérifiez que :

- [ x ] Projet Firebase créé
- [ x ] Firebase Authentication activé
- [ x ] Google Sign-In activé et configuré
- [ x ] Facebook Sign-In activé et configuré (optionnel)
- [ x ] Cloud Firestore activé
- [  ] Règles Firestore configurées
- [ x ] Clé privée Admin SDK téléchargée (backend)
- [ x ] Variables d'environnement backend configurées
- [ x ] Variables d'environnement frontend configurées
- [ x ] Fichier `.env` ajouté au `.gitignore`

---

## 🧪 Test de la configuration

### Test 1 : Vérifier Firebase Admin SDK (Backend)

```bash
cd backend
python -c "from app.core.security import init_firebase; init_firebase(); print('✅ Firebase Admin SDK configuré correctement')"
```

### Test 2 : Vérifier Firebase Client (Frontend)

```bash
cd frontend
npm run dev
# Ouvrez http://localhost:3000/login
# Essayez de vous connecter avec Google
```

---

## 🔒 Sécurité

### ⚠️ Important

1. **Ne commitez JAMAIS** :
   - Le fichier JSON de service account
   - Les fichiers `.env` avec les vraies clés
   - Les clés privées Firebase

2. **Utilisez `.gitignore`** :
   ```
   backend/.env
   backend/*-firebase-adminsdk-*.json
   backend/serviceAccountKey.json
   frontend/.env.local
   ```

3. **Pour la production** :
   - Utilisez des secrets dans votre plateforme de déploiement (Netlify, Cloud Run)
   - Configurez des règles Firestore strictes
   - Limitez les domaines autorisés pour CORS

---

## 📚 Ressources

- [Documentation Firebase Authentication](https://firebase.google.com/docs/auth)
- [Documentation Firestore](https://firebase.google.com/docs/firestore)
- [Documentation Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Facebook Developers Console](https://developers.facebook.com/)

---

## 🆘 Dépannage

### Erreur : "Firebase credentials not configured"
- Vérifiez que le fichier JSON existe ou que les variables d'environnement sont définies
- Vérifiez que le chemin du fichier est correct

### Erreur : "Invalid authentication credentials"
- Vérifiez que le token JWT est bien envoyé dans le header `Authorization`
- Vérifiez que Firebase Auth est bien configuré côté frontend

### Erreur : "Permission denied" dans Firestore
- Vérifiez les règles Firestore
- Vérifiez que l'utilisateur est bien authentifié

### Erreur : "CORS policy"
- Ajoutez votre domaine frontend dans `CORS_ORIGINS` du backend
- Vérifiez que le backend accepte les requêtes depuis votre frontend

