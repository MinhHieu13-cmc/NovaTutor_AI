# NovaTutor AI — Quick Start Guide

## Workflow: Local Docker → Test → Deploy GCP

```
Local Docker  →  Test tất cả  →  Push GCP Cloud Run
```

---

## 1. Chuẩn bị lần đầu

### 1.1 Điền API keys vào `.env` (root)

Mở file `.env` và điền:

```dotenv
GEMINI_API_KEY=AIza...              # bắt buộc cho AI chat
GOOGLE_API_KEY=AIza...              # bắt buộc cho Voice/Embedding
JWT_SECRET_KEY=thay_bang_32_ky_tu_random_thuc_su
```

> `GOOGLE_OAUTH_CLIENT_ID` đã được điền sẵn.

### 1.2 (Tuỳ chọn) GCP credentials cho Firestore/Storage local

Nếu muốn test Firestore và Cloud Storage từ local:

```powershell
# Download service account JSON từ GCP IAM
# Sau đó thêm vào .env:
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-key.json

# Và mount vào docker-compose.yml → backend → volumes:
#   - ./path/to/key.json:/run/secrets/gcp-key.json:ro
```

> **Không bắt buộc**: Nếu để trống, backend vẫn boot và health hoạt động.
> Các endpoint auth/course sẽ trả `503` cho đến khi có credentials.

---

## 2. Chạy local

```powershell
# Clone / vào thư mục dự án
cd C:\Users\HIEU\PycharmProjects\NovaTutor_AI

# Lần đầu tiên — build + up
docker compose up --build -d

# Lần tiếp theo (không đổi code)
docker compose up -d
```

### 2.1 Init database (chạy 1 lần duy nhất)

```powershell
Get-Content scripts\init_db.sql | docker exec -i novatutor_db psql -U postgres -d novatutor
```

### 2.2 Kiểm tra service

```powershell
docker compose ps

# Test endpoints
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/v1/health
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/v1/rag/health
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

### 2.3 Xem log

```powershell
docker compose logs backend -f
docker compose logs frontend -f
```

---

## 3. Test checklist (local)

| # | Test | URL | Expected |
|---|------|-----|----------|
| 1 | Backend health | `localhost:8000/api/v1/health` | `200 {"status":"healthy"}` |
| 2 | RAG health | `localhost:8000/api/v1/rag/health` | `200 {"status":"healthy"}` |
| 3 | Frontend home | `localhost:3000` | `200` trang home |
| 4 | Đăng ký | `localhost:3000/auth?mode=register` | Form submit thành công |
| 5 | Đăng nhập | `localhost:3000/auth?mode=login` | Redirect đúng role |
| 6 | Student dashboard | `localhost:3000/student` | Dashboard load |
| 7 | Teacher dashboard | `localhost:3000/teacher` | Dashboard load |
| 8 | AI Chat | Tab AI Assistant | Chat response |
| 9 | Create course | Teacher → Create | Course xuất hiện |
| 10 | Enroll course | Student → Enroll | Course vào My Courses |

> **Lưu ý:** Nếu chưa có GCP credentials, test 4-10 (phần Firestore) sẽ nhận `503`.
> Đây là bình thường khi test local không có ADC.

---

## 4. Deploy lên GCP

### Bước 1: Đặt JWT_SECRET_KEY thực

```powershell
# Tạo secret ngẫu nhiên
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copy kết quả → cập nhật `JWT_SECRET_KEY` trong GCP Secret Manager hoặc Cloud Run env.

### Bước 2: Deploy

```powershell
# Deploy đầy đủ (backend + frontend + infra)
.\scripts\deployment\deploy-gcp.ps1 -ProjectId novatotorai-489214 -Region us-central1

# Hoặc chỉ frontend (sau khi đổi UI)
.\scripts\deploy-frontend-quick.ps1

# Chỉ backend
gcloud builds submit ./backend --tag gcr.io/novatotorai-489214/novatutor-backend
gcloud run deploy novatutor-backend `
  --image gcr.io/novatotorai-489214/novatutor-backend `
  --region us-central1 `
  --platform managed
```

### Bước 3: Verify production

```powershell
$backend = "https://novatutor-backend-366729322781.us-central1.run.app"
Invoke-WebRequest -UseBasicParsing "$backend/api/v1/health"
Invoke-WebRequest -UseBasicParsing "$backend/api/v1/rag/health"
```

---

## 5. Cấu trúc environment theo môi trường

| File | Dùng khi | Ghi chú |
|------|----------|---------|
| `.env` | `docker compose` local | Đã có, chỉnh API keys |
| `frontend/.env.local` | FE local dev | Đã có, trỏ `localhost:8000` |
| GCP Cloud Run env vars | Production | Set qua `gcloud run deploy --set-env-vars` |
| GCP Secret Manager | Production | Dùng cho GEMINI_API_KEY, JWT_SECRET_KEY |

---

## 6. Kiến trúc kết nối

```
LOCAL:
Browser → localhost:3000 (Next.js) → localhost:8000 (FastAPI) → localhost:5432 (PostgreSQL)

GCP:
Browser → Cloud Run frontend → Cloud Run backend → Cloud SQL PostgreSQL
                                                 → Firestore
                                                 → Cloud Storage
                                                 → Vertex AI / Gemini
```

---

## 7. Troubleshooting nhanh

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `localhost:8000` refused | Backend chưa start | `docker compose up -d` |
| `localhost:3000` refused | Port mapping sai | Kiểm tra `docker compose ps`, đảm bảo `3000:8080` |
| `503 Firestore not configured` | Thiếu GCP credentials | Bình thường local, mount service account JSON |
| `401 Missing token` | Chưa đăng nhập | Login lại |
| DB error khi create course | Bảng chưa tạo | Chạy lại `init_db.sql` |
