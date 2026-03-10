# 🔧 NovaTutor Auth + Dashboard - GCP Integration Guide

## 📋 Giải pháp mới: GCP Native Services (Không Supabase)

Thay vì dùng Supabase, hệ thống giờ sử dụng **các dịch vụ GCP native** mà bạn đã triển khai:

| Chức năng | GCP Service | File |
|-----------|-------------|------|
| **Authentication** | Firestore + JWT | `auth_gcp.py` |
| **User Profiles** | Firestore | `auth_gcp.py` |
| **Courses** | Cloud SQL + Firestore | `courses_gcp.py` |
| **Documents** | Cloud Storage | `courses_gcp.py` |
| **Chat History** | Cloud SQL | (future) |

---

## 🚀 Setup GCP (5 phút)

### 1. Enable GCP APIs

```bash
gcloud services enable \
  firestore.googleapis.com \
  storage-api.googleapis.com \
  cloudsql.googleapis.com \
  iap.googleapis.com
```

### 2. Create Cloud SQL Database

```bash
gcloud sql databases create novatutor \
  --instance=novatutor-db \
  --charset=utf8mb4
```

### 3. Run SQL Migrations

```bash
# Download SQL file
gcloud sql connect novatutor-db --user=postgres

# Paste content từ scripts/gcp_schema.sql
\i scripts/gcp_schema.sql

# Verify
\dt  # List tables
\q  # Quit
```

### 4. Create Cloud Storage Bucket

```bash
gsutil mb gs://novatutor-documents-${PROJECT_ID}
gsutil iam ch serviceAccount:novatutor-backend@${PROJECT_ID}.iam.gserviceaccount.com:objectCreator \
  gs://novatutor-documents-${PROJECT_ID}
```

### 5. Setup Google OAuth

```bash
# Go to Google Cloud Console → APIs & Services → OAuth consent screen
# Configure as External app

# Then Create OAuth 2.0 Credentials → Web application
# Authorized JavaScript origins:
#   - http://localhost:3000
#   - https://yourdomain.com

# Authorized redirect URIs:
#   - http://localhost:3000/auth/callback
#   - https://yourdomain.com/auth/callback

# Copy Client ID → Save to .env
```

---

## 📝 Environment Variables

**Backend (.env)**
```env
# GCP Project
GCP_PROJECT_ID=novatotorai-489214
GCP_LOCATION=us-central1

# Cloud SQL
DATABASE_URL=postgresql://postgres:password@10.0.0.3:5432/novatutor
INSTANCE_CONNECTION_NAME=novatotorai-489214:us-central1:novatutor-db

# Cloud Storage
GCS_BUCKET_NAME=novatutor-documents-novatotorai-489214

# Authentication
JWT_SECRET_KEY=your-super-secret-key-change-in-production
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com

# Service Account (for local development)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## 🔐 Service Account Setup (for local dev)

```bash
# Create service account
gcloud iam service-accounts create novatutor-dev \
  --display-name="NovaTutor Dev"

# Grant roles
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:novatutor-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/firestore.user"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:novatutor-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:novatutor-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Download key
gcloud iam service-accounts keys create ~/novatutor-dev-key.json \
  --iam-account=novatutor-dev@${PROJECT_ID}.iam.gserviceaccount.com

# Set env var
export GOOGLE_APPLICATION_CREDENTIALS=~/novatutor-dev-key.json
```

---

## 🚀 Run Backend (Updated)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment
export GOOGLE_APPLICATION_CREDENTIALS=~/novatutor-dev-key.json

# Run server
python -m uvicorn app.main:app --reload
```

### API Endpoints (No Changes in Frontend!)

Endpoint tetap giống, nhưng backend giờ dùng GCP:

```
POST /api/v1/register
POST /api/v1/login
POST /api/v1/google
GET /api/v1/me
GET /api/v1/courses/available
POST /api/v1/courses/create
...
```

---

## 📊 Data Flow (GCP)

### Registration
```
Frontend Form
  ↓
POST /api/v1/register
  ↓
Backend:
  1. Hash password
  2. Save to Firestore (users collection)
  3. Create JWT token
  ↓
Return token + user
  ↓
Frontend stores token → Redirect to Dashboard
```

### Course Management
```
Teacher creates course
  ↓
POST /api/v1/courses/create
  ↓
Backend:
  1. Insert to Cloud SQL (courses table)
  2. Save to Firestore (courses collection) - for faster queries
  3. Return course ID
  ↓
Teacher uploads PDF
  ↓
POST /api/v1/courses/{id}/upload-document
  ↓
Backend:
  1. Upload to Cloud Storage
  2. Save metadata to Cloud SQL
  3. Save to Firestore
  ↓
Document ready for RAG
```

---

## ✅ Testing

### Test Register
```bash
curl -X POST http://localhost:8000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "full_name": "Test User",
    "role": "student"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

### Test Get Courses
```bash
curl -X GET http://localhost:8000/api/v1/courses/available
```

---

## 🔄 Migration from Previous Setup

If you had Supabase before:

1. **Database**: Move data from Supabase → Cloud SQL
   ```sql
   -- Export from Supabase
   pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
   
   -- Import to Cloud SQL
   psql -h 10.0.0.3 -U postgres -d novatutor < backup.sql
   ```

2. **Files**: Copy from Supabase Storage → Cloud Storage
   ```bash
   # Use GCS transfer tool or gsutil
   gsutil -m cp -r gs://old-bucket/* gs://new-bucket/
   ```

3. **Update Code**: Done! (auth_gcp.py + courses_gcp.py already use GCP)

---

## 🎯 Benefits of GCP Native

| Aspect | Supabase | GCP Native |
|--------|----------|-----------|
| **Cost** | Higher for scale | ✅ Pay per use |
| **Integration** | Third-party | ✅ Seamless with AI Platform |
| **Security** | IAM in Supabase | ✅ GCP IAM |
| **Performance** | Good | ✅ Better for AI workloads |
| **Support** | Supabase team | ✅ Google Cloud support |

---

## 📞 Troubleshooting

### Error: "Could not connect to Firestore"
- [ ] Check `GOOGLE_APPLICATION_CREDENTIALS` is set
- [ ] Verify service account has Firestore access
- [ ] Check firestore.googleapis.com API is enabled

### Error: "Database connection failed"
- [ ] Verify Cloud SQL instance is running
- [ ] Check INSTANCE_CONNECTION_NAME is correct
- [ ] Use Cloud SQL Auth proxy for local dev:
  ```bash
  cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE &
  ```

### Error: "Could not upload to Cloud Storage"
- [ ] Check bucket exists: `gsutil ls`
- [ ] Verify service account has storage.objectAdmin role
- [ ] Check bucket CORS if needed

---

## 🎓 Next Steps

1. ✅ Backend uses GCP (done)
2. ✅ Frontend unchanged (compatible)
3. ✅ Deploy to Cloud Run with new auth (done)
4. ✅ Test end-to-end (done - 2026-03-10)
5. [ ] Monitor GCP costs
6. [ ] Integrate frontend with backend APIs
7. [ ] Implement RAG engine + embeddings
8. [ ] Connect 3D Avatar + voice

---

## ✅ **Production Verification** (2026-03-10)

**Backend URL**: `https://novatutor-backend-366729322781.us-central1.run.app`

### Test Results
```
✅ Teacher Registration → User ID: H6GFCwA2QYxd8SAzCOJI
✅ Course Creation → Course ID: 1773112767.403782
✅ Student Registration → Success
✅ Student Enrollment → Enrollment ID: 1773112768.616727
✅ Student View Courses → 1 course returned with full data
```

**Status**: 🟢 **All systems operational**

See `DEPLOYMENT_SUCCESS_SUMMARY.md` for complete production report.

