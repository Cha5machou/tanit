# 🤖 Configuration de l'Agent IA

## Modèles par défaut

### Embeddings (Vectorisation des documents)

- **OpenAI** : Modèle par défaut de `OpenAIEmbeddings` (généralement `text-embedding-3-small`). Vous pouvez spécifier un modèle personnalisé dans l'interface admin.
- **Gemini** : `models/embedding-001` (modèle fixe, pas de personnalisation possible)

### LLM (Modèles de langage)

- **OpenAI** : `gpt-4o-mini`
- **Gemini** : `gemini-2.0-flash-exp`

## Configuration des API Keys

Les clés API doivent être configurées dans le fichier `.env` du backend.

### Fichier `.env` du backend

Créez ou modifiez le fichier `backend/.env` avec les variables suivantes :

```env
# OpenAI (pour embeddings et LLM)
OPENAI_API_KEY=sk-...

# Google Gemini (pour embeddings et LLM)
GOOGLE_API_KEY=...

# LangSmith (pour le monitoring des tokens et coûts)
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=votre-nom-de-projet

# Google Cloud Storage (pour stocker les documents)
GCS_BUCKET_NAME=votre-bucket-name
```

### Où obtenir les clés API

#### OpenAI API Key
1. Allez sur https://platform.openai.com/api-keys
2. Connectez-vous avec votre compte OpenAI
3. Cliquez sur "Create new secret key"
4. Copiez la clé (elle commence par `sk-`)
5. ⚠️ **Important** : La clé ne sera affichée qu'une seule fois, sauvegardez-la !

#### Google API Key (pour Gemini)
1. Allez sur https://makersuite.google.com/app/apikey
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Sélectionnez votre projet Google Cloud
5. Copiez la clé API

#### LangSmith API Key
1. Allez sur https://smith.langchain.com/
2. Créez un compte ou connectez-vous
3. Allez dans Settings > API Keys
4. Créez une nouvelle clé API
5. Notez aussi le nom de votre projet LangSmith

#### Google Cloud Storage Bucket
1. Allez sur https://console.cloud.google.com/storage
2. Sélectionnez votre projet
3. Cliquez sur "Create Bucket"
4. Donnez un nom unique à votre bucket (ex: `tanit-ai-documents`)
5. Choisissez une région proche de vous
6. Notez le nom du bucket

## Configuration via l'interface Admin

Une fois les clés API configurées dans `.env`, vous pouvez :

1. Aller sur `/admin/ai-agent`
2. Choisir votre provider d'embedding (OpenAI ou Gemini)
3. Choisir votre provider LLM (OpenAI ou Gemini)
4. Optionnellement spécifier des modèles personnalisés
5. Sauvegarder la configuration

La configuration est sauvegardée dans Firestore et utilisée pour toutes les requêtes suivantes.

## Modèles personnalisés

Vous pouvez spécifier des modèles personnalisés dans l'interface admin :

### OpenAI
- **Embeddings** : `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
- **LLM** : `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`

### Gemini
- **Embeddings** : `models/embedding-001` (seul modèle disponible actuellement)
- **LLM** : `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`

## Vérification de la configuration

Pour vérifier que tout est bien configuré :

1. Vérifiez que le fichier `backend/.env` contient toutes les clés nécessaires
2. Redémarrez le backend si vous avez modifié `.env`
3. Allez sur `/admin/ai-agent` et vérifiez que la configuration se charge
4. Testez en uploadant un document et en posant une question sur `/ai-chat`

## Dépannage

### Erreur "OPENAI_API_KEY not configured"
- Vérifiez que `OPENAI_API_KEY` est bien dans `backend/.env`
- Vérifiez qu'il n'y a pas d'espaces avant/après la clé
- Redémarrez le backend après modification de `.env`

### Erreur "GOOGLE_API_KEY not configured"
- Vérifiez que `GOOGLE_API_KEY` est bien dans `backend/.env`
- Assurez-vous que l'API Gemini est activée dans votre projet Google Cloud

### Erreur "No documents available"
- Upload au moins un fichier `.txt` via `/admin/ai-agent`
- Vérifiez que `GCS_BUCKET_NAME` est correctement configuré
- Vérifiez les permissions du service account pour accéder au bucket GCS

