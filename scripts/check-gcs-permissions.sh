#!/bin/bash

# Script pour vérifier les permissions GCS du service account
# Usage: ./scripts/check-gcs-permissions.sh

set -e

echo "🔍 Vérification des permissions Google Cloud Storage"
echo "=================================================="
echo ""

# Charger les variables d'environnement depuis .env si disponible
if [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Vérifier les variables nécessaires
if [ -z "$GCS_BUCKET_NAME" ]; then
    echo "❌ ERREUR: GCS_BUCKET_NAME n'est pas défini"
    echo "   Définissez-le dans votre fichier .env backend"
    exit 1
fi

if [ -z "$FIREBASE_CLIENT_EMAIL" ]; then
    echo "❌ ERREUR: FIREBASE_CLIENT_EMAIL n'est pas défini"
    echo "   Définissez-le dans votre fichier .env backend"
    exit 1
fi

if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "❌ ERREUR: FIREBASE_PROJECT_ID n'est pas défini"
    echo "   Définissez-le dans votre fichier .env backend"
    exit 1
fi

echo "📋 Configuration détectée:"
echo "   Bucket: $GCS_BUCKET_NAME"
echo "   Service Account: $FIREBASE_CLIENT_EMAIL"
echo "   Project ID: $FIREBASE_PROJECT_ID"
echo ""

# Vérifier si gcloud est installé
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  gcloud CLI n'est pas installé"
    echo "   Installez-le avec: brew install google-cloud-sdk"
    echo "   Ou suivez: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "📖 Consultez docs/GCS_PERMISSIONS.md pour vérifier via la console web"
    exit 0
fi

echo "🔐 Vérification des permissions..."
echo ""

# Vérifier les permissions au niveau du bucket
echo "1️⃣  Permissions au niveau du bucket:"
if gsutil iam get gs://$GCS_BUCKET_NAME 2>/dev/null | grep -q "$FIREBASE_CLIENT_EMAIL"; then
    echo "   ✅ Service account trouvé dans les permissions du bucket"
    echo "   Permissions:"
    gsutil iam get gs://$GCS_BUCKET_NAME 2>/dev/null | grep -A 5 "$FIREBASE_CLIENT_EMAIL" || echo "   (Détails non disponibles)"
else
    echo "   ❌ Service account NON trouvé dans les permissions du bucket"
    echo ""
    echo "   Pour ajouter les permissions, exécutez:"
    echo "   gsutil iam ch serviceAccount:$FIREBASE_CLIENT_EMAIL:roles/storage.objectAdmin gs://$GCS_BUCKET_NAME"
fi

echo ""
echo "2️⃣  Permissions au niveau du projet:"
if gcloud projects get-iam-policy $FIREBASE_PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:$FIREBASE_CLIENT_EMAIL" \
    --format="table(bindings.role)" 2>/dev/null | grep -q "storage"; then
    echo "   ✅ Service account a des rôles Storage au niveau projet"
    echo "   Rôles:"
    gcloud projects get-iam-policy $FIREBASE_PROJECT_ID \
        --flatten="bindings[].members" \
        --filter="bindings.members:serviceAccount:$FIREBASE_CLIENT_EMAIL" \
        --format="table(bindings.role)" 2>/dev/null | grep storage || true
else
    echo "   ⚠️  Aucun rôle Storage trouvé au niveau projet"
    echo "   (Les permissions au niveau bucket peuvent suffire)"
fi

echo ""
echo "3️⃣  Test d'accès au bucket:"
if gsutil ls gs://$GCS_BUCKET_NAME/ 2>/dev/null > /dev/null; then
    echo "   ✅ Accès au bucket réussi"
    echo "   Contenu du bucket:"
    gsutil ls gs://$GCS_BUCKET_NAME/ 2>/dev/null | head -5 || echo "   (vide ou erreur)"
else
    echo "   ❌ Impossible d'accéder au bucket"
    echo "   Vérifiez:"
    echo "   - Que le bucket existe: gsutil ls gs://$GCS_BUCKET_NAME/"
    echo "   - Que vous êtes authentifié: gcloud auth list"
    echo "   - Que le service account a les permissions"
fi

echo ""
echo "✅ Vérification terminée"
echo ""
echo "📖 Pour plus de détails, consultez: docs/GCS_PERMISSIONS.md"

