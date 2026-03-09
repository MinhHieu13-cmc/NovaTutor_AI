# NovaTutor AI - QUICKSTART GCP (Synced)

Quickstart nay da duoc dong bo voi `DEPLOYMENT_GUIDE.md` theo trang thai deploy hien tai.

## Muc tieu

Deploy NovaTutor AI len GCP (Cloud Run + Cloud SQL + pgvector) voi cau hinh da xac minh hoat dong.

## Thong tin hien tai

- Project ID: `novatotorai-489214`
- Region: `us-central1`
- Backend service: `novatutor-backend`
- Frontend service: `novatutor-frontend`
- Cloud SQL instance: `novatutor-db`

## 1) Prerequisites

```powershell
gcloud --version
gcloud config set project novatotorai-489214
gcloud auth list
docker --version
```

Bat API can thiet:

```powershell
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

## 2) Cloud SQL setup

Tao instance (bo qua neu da co):

```powershell
gcloud sql instances create novatutor-db `
  --database-version=POSTGRES_15 `
  --tier=db-f1-micro `
  --region=us-central1 `
  --root-password=YOUR_ROOT_PASSWORD
```

Tao database va user cho app:

```powershell
gcloud sql databases create novatutor --instance=novatutor-db
gcloud sql users create novatutor-user --instance=novatutor-db --password=YOUR_USER_PASSWORD
```

Kiem tra:

```powershell
gcloud sql instances describe novatutor-db --format="value(state,connectionName)"
gcloud sql databases list --instance=novatutor-db
gcloud sql users list --instance=novatutor-db
```

Bat `pgvector` trong database `novatutor` (khuyen nghi qua Cloud SQL Studio):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname FROM pg_extension WHERE extname='vector';
```

## 3) IAM cho backend

Tao service account (bo qua neu da co):

```powershell
gcloud iam service-accounts create novatutor-backend --display-name "NovaTutor Backend"
```

Gan role runtime:

```powershell
$PROJECT_ID = "novatotorai-489214"
$SA_EMAIL = "novatutor-backend@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/logging.logWriter"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/monitoring.metricWriter"
```

Gan quyen deploy (`actAs`) cho user deploy:

```powershell
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL --member="user:sohaki0077@gmail.com" --role="roles/iam.serviceAccountUser"
```

## 4) Build va deploy backend

Build/push image:

```powershell
$PROJECT_ID = "novatotorai-489214"
$IMAGE = "gcr.io/$PROJECT_ID/novatutor-backend:latest"

gcloud auth configure-docker gcr.io
docker build -t $IMAGE -f backend/Dockerfile backend
docker push $IMAGE
```

Deploy backend (Cloud SQL socket format cho `asyncpg`):

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

## 5) Build va deploy frontend

```powershell
$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$BACKEND_URL = gcloud run services describe novatutor-backend --region=$REGION --format="value(status.url)"
$FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/novatutor-frontend:latest"

docker build -t $FRONTEND_IMAGE -f frontend/Dockerfile frontend
docker push $FRONTEND_IMAGE

gcloud run deploy novatutor-frontend `
  --image=$FRONTEND_IMAGE `
  --platform=managed `
  --region=$REGION `
  --allow-unauthenticated `
  --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL"
```

## 6) Post-deploy smoke test (moi release)

Su dung section nay moi lan release de verify nhanh API + frontend + DB.

### 6.1 API health/docs

```powershell
$REGION = "us-central1"
$BACKEND_URL = gcloud run services describe novatutor-backend --region=$REGION --format="value(status.url)"

gcloud run services describe novatutor-backend --region=$REGION --format="value(status.conditions[0].status,status.conditions[0].message)"
Invoke-WebRequest -Uri "$BACKEND_URL/docs" -UseBasicParsing | Select-Object StatusCode
```

Expected:
- condition status = `True`
- `/docs` tra `200`

### 6.2 Frontend serving

```powershell
$REGION = "us-central1"
$FRONTEND_URL = gcloud run services describe novatutor-frontend --region=$REGION --format="value(status.url)"

gcloud run services describe novatutor-frontend --region=$REGION --format="value(status.conditions[0].status,status.conditions[0].message)"
Invoke-WebRequest -Uri "$FRONTEND_URL" -UseBasicParsing | Select-Object StatusCode
```

Expected:
- condition status = `True`
- frontend tra `200`

### 6.3 DB and pgvector

```powershell
gcloud sql instances describe novatutor-db --format="value(state,connectionName)"
gcloud sql databases list --instance=novatutor-db
gcloud sql users list --instance=novatutor-db
```

Expected:
- instance state = `RUNNABLE`
- co database `novatutor`
- co user `novatutor-user`

Kiem tra `vector` extension qua Cloud SQL Studio (database `novatutor`):

```sql
SELECT extname FROM pg_extension WHERE extname='vector';
```

Expected: 1 dong `vector`.

### 6.4 Logs check

```powershell
gcloud run services logs read novatutor-backend --region=us-central1 --limit=80
gcloud run services logs read novatutor-frontend --region=us-central1 --limit=80
```

## 7) Troubleshooting nhanh

- `iam.serviceaccounts.actAs denied`:
  - Gan `roles/iam.serviceAccountUser` cho user deploy tren service account backend.
- `DATABASE_URL is not set`:
  - Dam bao `--set-env-vars` co `DATABASE_URL=...`.
- `Temporary failure in name resolution`:
  - Sai URL DB; phai dung format socket `?host=/cloudsql/...`.
- `database "novatutor" does not exist`:
  - Tao DB: `gcloud sql databases create novatutor --instance=novatutor-db`.

## 8) Security

- Khong commit password/API key that.
- Uu tien Secret Manager cho production.
- Rotate credential sau khi setup.
