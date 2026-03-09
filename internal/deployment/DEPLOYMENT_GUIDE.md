# NovaTutor AI - GCP Deployment Guide (Updated)

This guide reflects the current deployment flow that worked for project `novatotorai-489214` in `us-central1`.

## Current deployed services

- Backend: `https://novatutor-backend-qz2gdtaatq-uc.a.run.app`
- Frontend: `https://novatutor-frontend-qz2gdtaatq-uc.a.run.app`

## Prerequisites

- Billing enabled on GCP project
- `gcloud` authenticated with correct project
- Docker installed locally
- Gemini API key

## 1) Set project and enable APIs

```powershell
gcloud config set project novatotorai-489214
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

## 2) Cloud SQL setup

Create instance (skip if already created):

```powershell
gcloud sql instances create novatutor-db `
  --database-version=POSTGRES_15 `
  --tier=db-f1-micro `
  --region=us-central1 `
  --root-password=YOUR_ROOT_PASSWORD
```

Create app database and user:

```powershell
gcloud sql databases create novatutor --instance=novatutor-db
gcloud sql users create novatutor-user --instance=novatutor-db --password=YOUR_USER_PASSWORD
```

Verify:

```powershell
gcloud sql instances describe novatutor-db --format="value(state,connectionName)"
gcloud sql databases list --instance=novatutor-db
gcloud sql users list --instance=novatutor-db
```

Enable `pgvector` extension in database `novatutor` (Cloud SQL Studio recommended):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname FROM pg_extension WHERE extname='vector';
```

## 3) IAM and Service Account for backend

Create service account (skip if exists):

```powershell
gcloud iam service-accounts create novatutor-backend --display-name "NovaTutor Backend"
```

Grant runtime roles to service account:

```powershell
$PROJECT_ID = "novatotorai-489214"
$SA_EMAIL = "novatutor-backend@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/logging.logWriter"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/monitoring.metricWriter"
```

Grant deployer `actAs` permission (required):

```powershell
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL --member="user:sohaki0077@gmail.com" --role="roles/iam.serviceAccountUser"
```

## 4) Build and push backend image

From project root:

```powershell
$PROJECT_ID = "novatotorai-489214"
$IMAGE = "gcr.io/$PROJECT_ID/novatutor-backend:latest"

gcloud auth configure-docker gcr.io
docker build -t $IMAGE -f backend/Dockerfile backend
docker push $IMAGE
```

## 5) Deploy backend to Cloud Run

Use Cloud SQL Unix socket format for `asyncpg` (this is critical):

```powershell
$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$INSTANCE = "novatutor-db"
$DB_USER = "novatutor-user"
$DB_PASS = "YOUR_USER_PASSWORD"
$SA = "novatutor-backend@$PROJECT_ID.iam.gserviceaccount.com"
$IMAGE = "gcr.io/$PROJECT_ID/novatutor-backend:latest"
$CONN = "{0}:{1}:{2}" -f $PROJECT_ID, $REGION, $INSTANCE
$DB_URL = "postgresql+asyncpg://{0}:{1}@/novatutor?host=/cloudsql/{2}" -f $DB_USER, $DB_PASS, $CONN

gcloud run deploy novatutor-backend `
  --image=$IMAGE `
  --platform=managed `
  --region=$REGION `
  --allow-unauthenticated `
  --service-account=$SA `
  --add-cloudsql-instances=$CONN `
  --set-env-vars="DATABASE_URL=$DB_URL,GCP_PROJECT_ID=$PROJECT_ID,DEBUG=false"
```

Validate backend:

```powershell
gcloud run services describe novatutor-backend --region=us-central1 --format="value(status.url,status.conditions[0].status,status.conditions[0].message)"
$BACKEND_URL = gcloud run services describe novatutor-backend --region=us-central1 --format="value(status.url)"
Invoke-WebRequest -Uri "$BACKEND_URL/docs" -UseBasicParsing | Select-Object StatusCode
```

## 6) Deploy frontend to Cloud Run

Build and push:

```powershell
$PROJECT_ID = "novatotorai-489214"
$FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/novatutor-frontend:latest"

docker build -t $FRONTEND_IMAGE -f frontend/Dockerfile frontend
docker push $FRONTEND_IMAGE
```

Deploy with backend URL:

```powershell
$REGION = "us-central1"
$BACKEND_URL = "https://novatutor-backend-qz2gdtaatq-uc.a.run.app"

gcloud run deploy novatutor-frontend `
  --image=$FRONTEND_IMAGE `
  --platform=managed `
  --region=$REGION `
  --allow-unauthenticated `
  --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL"
```

Validate frontend:

```powershell
gcloud run services describe novatutor-frontend --region=us-central1 --format="value(status.url,status.conditions[0].status,status.conditions[0].message)"
```

## 7) Logging and troubleshooting

Read Cloud Run logs (correct command):

```powershell
gcloud run services logs read novatutor-backend --region=us-central1 --limit=100
gcloud run services logs read novatutor-frontend --region=us-central1 --limit=100
```

Filter one specific revision:

```powershell
$SERVICE = "novatutor-backend"
$REV = "novatutor-backend-00005-l9k"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE AND resource.labels.revision_name=$REV" --limit=100 --format="value(textPayload)"
```

Common failures and fixes:

- `iam.serviceaccounts.actAs denied`:
  - grant `roles/iam.serviceAccountUser` on backend service account to deployer user.
- `DATABASE_URL is not set`:
  - ensure `--set-env-vars` includes `DATABASE_URL=...`.
- `Temporary failure in name resolution`:
  - URL format is wrong; use socket format with `?host=/cloudsql/...`.
- `database "novatutor" does not exist`:
  - create DB with `gcloud sql databases create novatutor --instance=novatutor-db`.

## 8) Security notes

- Do not commit real DB passwords or API keys.
- Prefer Secret Manager for production secrets.
- Keep service account permissions minimal.
- Rotate credentials after setup/testing.
