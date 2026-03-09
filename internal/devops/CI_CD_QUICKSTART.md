# Quick CI/CD Setup Checklist

Checklist nhanh để setup CI/CD trong 10 phút.

## ✅ Pre-requisites

- [ ] GitHub repo đã push code
- [ ] GCP project đã có backend/frontend chạy
- [ ] `gcloud` CLI authenticated

## 📋 Setup Steps

### 1. Tạo Service Account cho GitHub Actions (2 phút)

```powershell
$PROJECT_ID = "novatotorai-489214"
$CI_SA = "github-actions@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts create github-actions --display-name="GitHub Actions CI/CD"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CI_SA" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CI_SA" --role="roles/storage.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CI_SA" --role="roles/iam.serviceAccountUser"

gcloud iam service-accounts keys create github-actions-key.json --iam-account=$CI_SA
```

### 2. Add GitHub Secrets (3 phút)

Vào: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Thêm 5 secrets:

| Name | Value | Where to get |
|------|-------|--------------|
| `GCP_SA_KEY` | Nội dung file `github-actions-key.json` | Copy từ file vừa tạo |
| `DB_USER` | `novatutor-user` | Cloud SQL user |
| `DB_PASS` | Your DB password | Password bạn đã set |
| `BACKEND_SA_EMAIL` | `novatutor-backend@novatotorai-489214.iam.gserviceaccount.com` | Backend service account |
| `GEMINI_API_KEY` | Your Gemini key | https://ai.google.dev |

```powershell
# Copy JSON key vào clipboard
Get-Content github-actions-key.json | Set-Clipboard
# Paste vào GitHub Secret GCP_SA_KEY
```

### 3. Verify Workflow File (1 phút)

- [ ] File `.github/workflows/ci-cd.yml` đã có trong repo
- [ ] Commit và push lên GitHub

```powershell
git add .github/workflows/ci-cd.yml
git commit -m "Add CI/CD workflow"
git push origin main
```

### 4. Monitor First Run (4 phút)

- [ ] Vào `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
- [ ] Xem workflow "CI/CD Pipeline" đang chạy
- [ ] Chờ ~4-6 phút để hoàn tất

Expected output:
```
✅ Backend CI - passed
✅ Frontend CI - passed
✅ Backend Deploy - passed
✅ Frontend Deploy - passed
```

### 5. Verify Deployment

```powershell
# Check backend
$BACKEND_URL = gcloud run services describe novatutor-backend --region=us-central1 --format="value(status.url)"
Invoke-WebRequest -Uri "$BACKEND_URL/docs" | Select-Object StatusCode

# Check frontend
$FRONTEND_URL = gcloud run services describe novatutor-frontend --region=us-central1 --format="value(status.url)"
Invoke-WebRequest -Uri $FRONTEND_URL | Select-Object StatusCode
```

## 🎉 Done!

Giờ mỗi khi push code lên `main` branch, workflow sẽ tự động:
1. Test backend/frontend
2. Build Docker images
3. Deploy lên Cloud Run
4. Run health checks

## 🔄 Next Push

```powershell
# Make changes
git add .
git commit -m "Update feature X"
git push origin main

# Workflow tự động chạy - xem tại GitHub Actions tab
```

## 🐛 Quick Troubleshooting

**Lỗi "Permission denied"**
→ Check service account roles: `gcloud iam service-accounts get-iam-policy $CI_SA`

**Lỗi "Secret not found"**
→ Verify secrets: GitHub repo → Settings → Secrets → Actions

**Deploy failed**
→ Check logs: GitHub Actions → Click vào failed job → Expand steps

**Health check failed**
→ Kiểm tra service logs: `gcloud run services logs read novatutor-backend --region=us-central1 --limit=50`

## 📚 Full Docs

Xem `CI_CD_SETUP.md` để biết chi tiết.

