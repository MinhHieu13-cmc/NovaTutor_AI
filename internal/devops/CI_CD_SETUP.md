# CI/CD Setup Guide

Hướng dẫn thiết lập CI/CD cho NovaTutor AI với GitHub Actions.

## Quy trình CI/CD

### Workflow Overview

```
┌─────────────────────────────────────────────────────────┐
│  Push to main/develop or Pull Request                  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼────────┐
│  Backend CI    │      │  Frontend CI    │
│  - Lint        │      │  - Lint         │
│  - Test        │      │  - Build        │
│  - Coverage    │      │  - Type check   │
└───────┬────────┘      └────────┬────────┘
        │                         │
        └────────────┬────────────┘
                     │ (main branch only)
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼────────┐
│  Backend CD    │      │  Frontend CD    │
│  - Build image │      │  - Build image  │
│  - Push GCR    │      │  - Push GCR     │
│  - Deploy CR   │      │  - Deploy CR    │
│  - Health check│      │  - Health check │
└────────────────┘      └─────────────────┘
```

## 1) Cấu hình GitHub Secrets

Vào GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `GCP_SA_KEY` | Service account JSON key | `{"type": "service_account", ...}` |
| `DB_USER` | Cloud SQL app user | `novatutor-user` |
| `DB_PASS` | Cloud SQL app password | `your-secure-password` |
| `BACKEND_SA_EMAIL` | Backend service account email | `novatutor-backend@PROJECT.iam.gserviceaccount.com` |
| `GEMINI_API_KEY` | Gemini API key (optional) | `AIza...` |

### Cách lấy GCP Service Account Key

```powershell
# Tạo service account cho CI/CD
gcloud iam service-accounts create github-actions `
  --display-name="GitHub Actions CI/CD"

# Gán quyền cần thiết
$PROJECT_ID = "novatotorai-489214"
$CI_SA = "github-actions@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$CI_SA" `
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$CI_SA" `
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$CI_SA" `
  --role="roles/iam.serviceAccountUser"

# Tạo và download key
gcloud iam service-accounts keys create github-actions-key.json `
  --iam-account=$CI_SA

# Copy nội dung file JSON này vào GitHub Secret GCP_SA_KEY
Get-Content github-actions-key.json | clip
```

## 2) Workflow Triggers

- **Push to `main`**: Full CI/CD (test + deploy)
- **Push to `develop`**: CI only (test, no deploy)
- **Pull Request to `main`**: CI only (test, no deploy)

## 3) CI Stages

### Backend CI
- Python 3.11 setup
- Install dependencies
- Lint with flake8
- Run pytest with coverage

### Frontend CI
- Node.js 18 setup
- Install dependencies
- ESLint check
- Next.js build

## 4) CD Stages (main branch only)

### Backend Deploy
1. Build Docker image with commit SHA tag
2. Push to Google Container Registry
3. Deploy to Cloud Run with:
   - Cloud SQL connection
   - Environment variables
   - Service account
4. Health check on `/docs` endpoint

### Frontend Deploy
1. Get backend URL from previous deploy
2. Build Docker image with backend URL
3. Push to GCR
4. Deploy to Cloud Run
5. Health check on root endpoint

## 5) Monitoring Deployments

### GitHub Actions UI
- Mỗi commit có status badge
- Click vào workflow run để xem logs chi tiết
- Rollback bằng cách revert commit

### GCloud CLI
```powershell
# Xem deployment history
gcloud run services describe novatutor-backend --region=us-central1

# Xem logs của revision mới
gcloud run services logs read novatutor-backend --region=us-central1 --limit=100

# Rollback về revision trước
gcloud run services update-traffic novatutor-backend `
  --region=us-central1 `
  --to-revisions=novatutor-backend-00004-xyz=100
```

## 6) Local Testing Before Push

Để tránh lỗi CI, test local trước:

### Backend
```powershell
cd backend
pip install -r requirements.txt
pip install pytest flake8
flake8 .
pytest
```

### Frontend
```powershell
cd frontend
npm install
npm run lint
npm run build
```

## 7) Troubleshooting

### ❌ "Permission denied" during deploy
- Kiểm tra service account có đủ quyền `roles/run.admin`
- Kiểm tra `GCP_SA_KEY` secret đúng format JSON

### ❌ Build failed
- Xem logs trong GitHub Actions
- Test build local: `docker build -t test -f backend/Dockerfile backend`

### ❌ Health check failed
- Backend: kiểm tra `/docs` có accessible không
- Frontend: kiểm tra `NEXT_PUBLIC_API_URL` trỏ đúng backend

### ❌ Cloud SQL connection error
- Verify service account có `roles/cloudsql.client`
- Kiểm tra `DATABASE_URL` format đúng
- Ensure `--add-cloudsql-instances` có đúng connection name

## 8) Best Practices

1. **Branch Protection**
   - Require PR review before merge to main
   - Require status checks to pass

2. **Environment Separation**
   - `main` branch → production
   - `develop` branch → staging (thêm workflow riêng nếu cần)

3. **Secret Rotation**
   - Rotate GCP service account keys định kỳ (3-6 tháng)
   - Update GitHub secrets khi rotate

4. **Rollback Strategy**
   - Cloud Run giữ nhiều revisions
   - Có thể rollback instant bằng traffic split
   - Hoặc revert commit và push lại

5. **Monitoring**
   - Setup Cloud Logging alerts cho errors
   - Monitor Cloud Run metrics (latency, errors)

## 9) Advanced: Staging Environment

Nếu muốn thêm staging environment:

```yaml
# .github/workflows/staging.yml
on:
  push:
    branches: [ develop ]

env:
  PROJECT_ID: novatotorai-489214
  REGION: us-central1
  BACKEND_SERVICE: novatutor-backend-staging
  FRONTEND_SERVICE: novatutor-frontend-staging
```

## 10) Cost Optimization

- CI/CD trên GitHub Actions: free cho public repos
- Cloud Run: chỉ charge khi có traffic
- Dùng `--min-instances=0` để scale to zero
- Set `--max-instances` để limit cost

## References

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Cloud Run CI/CD](https://cloud.google.com/run/docs/continuous-deployment)
- [GCP Service Accounts](https://cloud.google.com/iam/docs/service-accounts)

