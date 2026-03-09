# NovaTutor AI - GCP Deployment Guide (Chi tiết)

## 📋 Yêu cầu tiên quyết

- ✅ Google Cloud Project với billing enabled: `novatotorai-489214`
- ✅ gcloud CLI đã cài đặt và authenticated
- ✅ Docker đã cài đặt
- ✅ Gemini API Key (lấy từ https://ai.google.dev)

## 🚀 Cách triển khai nhanh (Sử dụng Script)

### Bước 1: Chuẩn bị
```powershell
# Mở PowerShell tại thư mục project
cd C:\Users\HIEU\PycharmProjects\NovaTutor_AI

# Đặt Gemini API Key
$env:GEMINI_API_KEY = "your-gemini-api-key-here"
```

### Bước 2: Chạy deployment script
```powershell
# Chạy script (không cần parameter nếu dùng giá trị default)
.\scripts\deployment\deploy-gcp.ps1 `
    -ProjectId novatotorai-489214 `
    -Region us-central1 `
    -GeminiApiKey $env:GEMINI_API_KEY
```

Script sẽ tự động:
- ✅ Enable tất cả APIs cần thiết
- ✅ Tạo Cloud SQL PostgreSQL instance
- ✅ Tạo database và user
- ✅ Tạo service account
- ✅ Build và push Docker images
- ✅ Deploy backend & frontend lên Cloud Run

## 📝 Triển khai từng bước (Manual)

### Bước 1: Chuẩn bị môi trường GCP

```powershell
# 1.1. Set project
gcloud config set project novatotorai-489214

# 1.2. Enable APIs cần thiết
gcloud services enable aiplatform.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Bước 2: Tạo Cloud SQL PostgreSQL

```powershell
# 2.1. Tạo instance
gcloud sql instances create novatutor-db `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=us-central1 `
    --root-password=novatutorai_db_pass_2024

# 2.2. Tạo database
gcloud sql databases create novatutor `
    --instance=novatutor-db

# 2.3. Tạo user
gcloud sql users create novatutor-user `
    --instance=novatutor-db `
    --password=novatutorai_user_pass_2024

# 2.4. Lấy connection name
gcloud sql instances describe novatutor-db `
    --format='value(connectionName)'
# Output: novatotorai-489214:us-central1:novatutor-db
```

### Bước 3: Bật pgvector extension

```powershell
# 3.1. Kết nối tới Cloud SQL
gcloud sql connect novatutor-db --user=postgres

# 3.2. Khi prompt nhập password, gõ: novatutorai_db_pass_2024

# 3.3. Chạy SQL command:
CREATE EXTENSION IF NOT EXISTS vector;

# 3.4. Kiểm tra
SELECT * FROM pg_extension WHERE extname = 'vector';

# 3.5. Thoát
\q
```

### Bước 4: Tạo Service Account

```powershell
# 4.1. Tạo service account
gcloud iam service-accounts create novatutor-backend `
    --description="Service account for NovaTutor backend"

# 4.2. Gán roles
$PROJECT_ID = "novatotorai-489214"
$SA_EMAIL = "novatutor-backend@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/logging.logWriter"

# 4.3. Download service account key
gcloud iam service-accounts keys create backend-key.json `
    --iam-account=$SA_EMAIL
```

### Bước 5: Chuẩn bị Backend

```powershell
# 5.1. Tạo .env.gcp file
$CONN_NAME = "novatotorai-489214:us-central1:novatutor-db"
$GEMINI_API_KEY = "your-gemini-api-key"

@"
GCP_PROJECT_ID=novatotorai-489214
DATABASE_URL=postgresql+asyncpg://novatutor-user:novatutorai_user_pass_2024@cloudsql/$CONN_NAME/novatutor
GOOGLE_API_KEY=$GEMINI_API_KEY
LLM_PROVIDER=google
DEBUG=false
"@ | Set-Content -Path ".env.gcp"

# 5.2. Build Docker image
cd backend
docker build -t gcr.io/novatotorai-489214/novatutor-backend:latest .
cd ..

# 5.3. Authenticate Docker with GCR
gcloud auth configure-docker gcr.io

# 5.4. Push image
docker push gcr.io/novatotorai-489214/novatutor-backend:latest
```

### Bước 6: Deploy Backend lên Cloud Run

```powershell
$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$CONN_NAME = "novatotorai-489214:us-central1:novatutor-db"
$SA_EMAIL = "novatutor-backend@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud run deploy novatutor-backend `
    --image=gcr.io/$PROJECT_ID/novatutor-backend:latest `
    --platform=managed `
    --region=$REGION `
    --allow-unauthenticated `
    --add-cloudsql-instances=$CONN_NAME `
    --set-env-vars="DATABASE_URL=postgresql+asyncpg://novatutor-user:novatutorai_user_pass_2024@cloudsql/$CONN_NAME/novatutor,GCP_PROJECT_ID=$PROJECT_ID" `
    --service-account=$SA_EMAIL `
    --memory=2Gi `
    --cpu=2

# Lấy URL backend
$BACKEND_URL = gcloud run services describe novatutor-backend `
    --region=$REGION `
    --format='value(status.url)'

Write-Output "Backend URL: $BACKEND_URL"
```

### Bước 7: Deploy Frontend lên Cloud Run

```powershell
# 7.1. Build frontend image
cd frontend
docker build -t gcr.io/novatotorai-489214/novatutor-frontend:latest .
cd ..

# 7.2. Push image
docker push gcr.io/novatotorai-489214/novatutor-frontend:latest

# 7.3. Deploy frontend
$BACKEND_URL = "https://your-backend-url" # Thay từ bước 6
$GEMINI_API_KEY = "your-gemini-api-key"

gcloud run deploy novatutor-frontend `
    --image=gcr.io/novatotorai-489214/novatutor-frontend:latest `
    --platform=managed `
    --region=us-central1 `
    --allow-unauthenticated `
    --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL,NEXT_PUBLIC_GEMINI_API_KEY=$GEMINI_API_KEY" `
    --memory=1Gi `
    --cpu=1

# Lấy URL frontend
gcloud run services describe novatutor-frontend `
    --region=us-central1 `
    --format='value(status.url)'
```

## 🔧 Tùy chỉnh theo nhu cầu

### Tăng tài nguyên cho Cloud Run

```powershell
# Backend - tăng memory và CPU
gcloud run services update novatutor-backend `
    --memory=4Gi `
    --cpu=4

# Auto-scaling
gcloud run services update novatutor-backend `
    --min-instances=1 `
    --max-instances=10
```

### Xem logs

```powershell
# Backend logs
gcloud logs read --filter='resource.type=cloud_run_revision AND resource.labels.service_name=novatutor-backend' `
    --limit 50 `
    --format json

# Frontend logs
gcloud logs read --filter='resource.type=cloud_run_revision AND resource.labels.service_name=novatutor-frontend' `
    --limit 50 `
    --format json
```

### Kết nối tới Cloud SQL từ máy local

```powershell
# Chạy Cloud SQL proxy
gcloud sql connect novatutor-db --user=novatutor-user

# Hoặc dùng proxy binary (download từ GCP)
.\cloud_sql_proxy.exe -instances=novatotorai-489214:us-central1:novatutor-db=tcp:5432
```

## 📊 Giám sát và Bảo trì

### Xem metrics
```powershell
# CPU usage
gcloud monitoring metrics-descriptors list `
    --filter='metric.type=run.googleapis.com/request_count'
```

### Quản lý database
```powershell
# Backup
gcloud sql backups create --instance=novatutor-db

# Restore
gcloud sql backups restore BACKUP_CONFIGURATION_ID --backup-instance=novatutor-db
```

## 🚨 Troubleshooting

### Backend không kết nối được tới database
```powershell
# Kiểm tra Cloud SQL proxy
gcloud sql instances describe novatutor-db

# Kiểm tra firewall rules
gcloud sql instances describe novatutor-db --format='value(settings.ipConfiguration.authorizedNetworks)'

# Fix: Cho phép Cloud Run IP
gcloud sql instances patch novatutor-db `
    --authorized-networks=0.0.0.0/0 `
    --backup-start-time=03:00
```

### pgvector không tìm thấy
```powershell
# Kiểm tra extension
gcloud sql connect novatutor-db --user=postgres
# Rồi chạy: SELECT * FROM pg_extension;
```

### Out of memory errors
```powershell
# Tăng memory
gcloud run services update novatutor-backend --memory=4Gi
```

## ✅ Kiểm tra triển khai

```powershell
# 1. Kiểm tra services chạy
gcloud run services list

# 2. Test backend API
curl https://your-backend-url/docs

# 3. Test frontend
Start-Process https://your-frontend-url

# 4. Kiểm tra database connection
gcloud sql connect novatutor-db --user=novatutor-user
# Rồi chạy: SELECT COUNT(*) FROM pg_extension WHERE extname='vector';
```

## 💰 Chi phí ước lượng

- **Cloud Run**: ~$0.15 per million requests (backend) + ~$0.15 per million requests (frontend)
- **Cloud SQL db-f1-micro**: ~$15/month + storage
- **Cloud Storage/GCS**: Phụ thuộc vào usage

Total tối thiểu: **~$20-30/month** cho development environment

---

**Lưu ý**: Thay thế `your-gemini-api-key` bằng API key thật từ https://ai.google.dev
