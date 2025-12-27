# Vérification des permissions Google Cloud Storage

Ce guide explique comment vérifier et configurer les permissions du service account pour accéder à Google Cloud Storage.

## 1. Identifier votre service account

Le service account utilisé est défini dans votre configuration Firebase. Vous pouvez le trouver dans :

- **Variable d'environnement** : `FIREBASE_CLIENT_EMAIL` dans votre `.env`
- **Fichier JSON** : Le champ `client_email` dans votre fichier de service account Firebase

Exemple : `firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com`

## 2. Vérifier les permissions via Google Cloud Console

### Méthode A : Vérifier les permissions au niveau du bucket

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Naviguez vers **Cloud Storage** > **Buckets**
4. Cliquez sur votre bucket (celui défini dans `GCS_BUCKET_NAME`)
5. Cliquez sur l'onglet **PERMISSIONS**
6. Cherchez votre service account dans la liste
7. Vérifiez qu'il a au moins un de ces rôles :
   - `Storage Admin` (`roles/storage.admin`) - Accès complet
   - `Storage Object Admin` (`roles/storage.objectAdmin`) - Gestion des objets
   - Ou les permissions spécifiques :
     - `storage.objects.create`
     - `storage.objects.list`
     - `storage.objects.get`
     - `storage.objects.delete`

### Méthode B : Vérifier les permissions au niveau du projet

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **IAM & Admin** > **IAM**
4. Cherchez votre service account dans la liste
5. Vérifiez les rôles assignés

## 3. Vérifier les permissions via gcloud CLI

### Installer gcloud CLI (si pas déjà fait)

```bash
# macOS
brew install google-cloud-sdk

# Ou télécharger depuis https://cloud.google.com/sdk/docs/install
```

### Se connecter et configurer

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Vérifier les permissions du bucket

```bash
# Remplacer BUCKET_NAME par votre nom de bucket
BUCKET_NAME="votre-bucket-name"
SERVICE_ACCOUNT="votre-service-account@votre-projet.iam.gserviceaccount.com"

# Vérifier les permissions IAM du bucket
gsutil iam get gs://$BUCKET_NAME

# Vérifier les permissions spécifiques du service account
gsutil iam get gs://$BUCKET_NAME | grep $SERVICE_ACCOUNT
```

### Vérifier les permissions au niveau projet

```bash
SERVICE_ACCOUNT="votre-service-account@votre-projet.iam.gserviceaccount.com"

# Lister les rôles du service account
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT" \
  --format="table(bindings.role)"
```

## 4. Ajouter les permissions nécessaires

### Via Google Cloud Console

1. Allez sur **Cloud Storage** > **Buckets** > Votre bucket
2. Cliquez sur **PERMISSIONS**
3. Cliquez sur **GRANT ACCESS**
4. Dans **New principals**, entrez l'email de votre service account
5. Dans **Select a role**, choisissez **Storage Object Admin** ou **Storage Admin**
6. Cliquez sur **SAVE**

### Via gcloud CLI

```bash
BUCKET_NAME="votre-bucket-name"
SERVICE_ACCOUNT="votre-service-account@votre-projet.iam.gserviceaccount.com"

# Ajouter le rôle Storage Object Admin au bucket
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectAdmin gs://$BUCKET_NAME

# Ou Storage Admin (accès complet)
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:roles/storage.admin gs://$BUCKET_NAME
```

### Via gcloud pour le projet entier

```bash
SERVICE_ACCOUNT="votre-service-account@votre-projet.iam.gserviceaccount.com"
PROJECT_ID="votre-projet-id"

# Ajouter Storage Object Admin au niveau projet
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.objectAdmin"
```

## 5. Rôles recommandés

Pour l'application, utilisez l'un de ces rôles :

### Option 1 : Storage Object Admin (recommandé)
- Permet de créer, lister, lire et supprimer des objets
- **Rôle** : `roles/storage.objectAdmin`
- **Permissions incluses** :
  - `storage.objects.create`
  - `storage.objects.list`
  - `storage.objects.get`
  - `storage.objects.delete`
  - `storage.objects.update`

### Option 2 : Storage Admin (si besoin de gestion complète)
- Accès complet au bucket
- **Rôle** : `roles/storage.admin`
- Permet aussi de gérer les ACLs et configurations du bucket

## 6. Tester les permissions

Après avoir configuré les permissions, testez avec :

```bash
BUCKET_NAME="votre-bucket-name"
SERVICE_ACCOUNT="votre-service-account@votre-projet.iam.gserviceaccount.com"

# Tester avec les credentials du service account
gcloud auth activate-service-account $SERVICE_ACCOUNT \
  --key-file=path/to/service-account-key.json

# Tester l'accès au bucket
gsutil ls gs://$BUCKET_NAME/

# Tester la création d'un fichier
echo "test" | gsutil cp - gs://$BUCKET_NAME/test.txt

# Nettoyer
gsutil rm gs://$BUCKET_NAME/test.txt
```

## 7. Dépannage

### Erreur : "Access Denied" ou "Forbidden"

1. Vérifiez que le service account a bien les permissions
2. Vérifiez que vous utilisez le bon service account (vérifiez `FIREBASE_CLIENT_EMAIL`)
3. Attendez quelques minutes après avoir ajouté les permissions (propagation IAM)

### Erreur : "Bucket not found"

1. Vérifiez que le nom du bucket est correct dans `GCS_BUCKET_NAME`
2. Vérifiez que le bucket existe dans le bon projet
3. Vérifiez que le projet est correct dans `FIREBASE_PROJECT_ID`

### Vérifier les logs détaillés

Les logs du backend devraient maintenant afficher des messages d'erreur plus détaillés. Vérifiez les logs Docker :

```bash
# Si vous utilisez Docker Compose
docker-compose logs backend | grep -i "gcs\|storage\|bucket"
```

## 8. Permissions minimales requises

Pour que l'application fonctionne, le service account doit avoir ces permissions sur le bucket :

- ✅ `storage.objects.create` - Pour uploader des fichiers
- ✅ `storage.objects.list` - Pour lister les fichiers
- ✅ `storage.objects.get` - Pour lire les fichiers
- ✅ `storage.objects.delete` - Pour supprimer les fichiers

Le rôle `Storage Object Admin` (`roles/storage.objectAdmin`) inclut toutes ces permissions.

