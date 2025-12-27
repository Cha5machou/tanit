# Infrastructure as Code - Google Cloud Platform

This directory contains the infrastructure configuration for deploying the City Platform to Google Cloud Platform.

## Structure

```
infra/
├── cloudbuild-frontend.yaml    # Cloud Build config for Next.js frontend
├── cloudbuild-backend.yaml     # Cloud Build config for FastAPI backend
└── cloudrun/
    ├── frontend-service.yaml   # Cloud Run service config for frontend
    └── backend-service.yaml    # Cloud Run service config for backend
```

## Prerequisites

1. Google Cloud Project created
2. Billing enabled
3. APIs enabled:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API
   - Artifact Registry API (optional, if using Artifact Registry)

## Setup

### 1. Set your project ID

```bash
export PROJECT_ID=your-project-id
export REGION=europe-west1  # Change to your preferred region
gcloud config set project $PROJECT_ID
```

### 2. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com
```

### 3. Grant Cloud Build permissions

```bash
# Grant Cloud Build service account permission to deploy to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Deployment

### Frontend Deployment

```bash
# Trigger Cloud Build for frontend
gcloud builds submit \
  --config=infra/cloudbuild-frontend.yaml \
  --substitutions=_REGION=$REGION
```

### Backend Deployment

```bash
# Trigger Cloud Build for backend
gcloud builds submit \
  --config=infra/cloudbuild-backend.yaml \
  --substitutions=_REGION=$REGION
```

### Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Build and push frontend
cd frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/city-platform-frontend

# Deploy frontend
gcloud run deploy city-platform-frontend \
  --image gcr.io/$PROJECT_ID/city-platform-frontend \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1

# Build and push backend
cd ../backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/city-platform-backend

# Deploy backend
gcloud run deploy city-platform-backend \
  --image gcr.io/$PROJECT_ID/city-platform-backend \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8000 \
  --memory 512Mi \
  --cpu 1
```

## Environment Variables

Set environment variables in Cloud Run:

### Frontend

```bash
gcloud run services update city-platform-frontend \
  --region $REGION \
  --update-env-vars \
    NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key,\
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com,\
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id,\
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com,\
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id,\
    NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id,\
    NEXT_PUBLIC_API_URL=https://city-platform-backend-xxxxx.run.app
```

### Backend

```bash
gcloud run services update city-platform-backend \
  --region $REGION \
  --update-secrets \
    FIREBASE_PROJECT_ID=firebase-project-id:latest,\
    FIREBASE_PRIVATE_KEY_ID=firebase-private-key-id:latest,\
    FIREBASE_PRIVATE_KEY=firebase-private-key:latest,\
    FIREBASE_CLIENT_EMAIL=firebase-client-email:latest,\
    FIREBASE_CLIENT_ID=firebase-client-id:latest \
  --update-env-vars \
    CORS_ORIGINS=https://city-platform-frontend-xxxxx.run.app,\
    ENVIRONMENT=production
```

## CI/CD Integration

### GitHub Actions (Example)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      - run: |
          gcloud builds submit \
            --config=infra/cloudbuild-frontend.yaml \
            --substitutions=_REGION=europe-west1

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      - run: |
          gcloud builds submit \
            --config=infra/cloudbuild-backend.yaml \
            --substitutions=_REGION=europe-west1
```

## Custom Domains

To set up custom domains:

```bash
# Map custom domain to frontend
gcloud run domain-mappings create \
  --service city-platform-frontend \
  --domain yourdomain.com \
  --region $REGION

# Map custom domain to backend
gcloud run domain-mappings create \
  --service city-platform-backend \
  --domain api.yourdomain.com \
  --region $REGION
```

## Monitoring

View logs:

```bash
# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=city-platform-frontend" --limit 50

# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=city-platform-backend" --limit 50
```

## Cost Optimization

- **Scale to zero**: Services scale to zero when not in use (configured with `min-instances: 0`)
- **CPU throttling**: Enabled to reduce costs during idle periods
- **Memory**: Set to 512Mi (adjust based on usage)
- **CPU**: Set to 1 vCPU (adjust based on load)

## Troubleshooting

### Build fails
- Check Cloud Build logs: `gcloud builds list`
- Verify Dockerfile syntax
- Ensure all dependencies are in package.json/requirements.txt

### Deployment fails
- Check Cloud Run logs: `gcloud run services logs read`
- Verify environment variables are set correctly
- Check IAM permissions for Cloud Build service account

### Service not accessible
- Verify `--allow-unauthenticated` flag is set
- Check CORS configuration in backend
- Verify firewall rules allow traffic

