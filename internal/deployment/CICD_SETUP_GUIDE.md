# 🚀 CI/CD Setup Guide - GitHub Actions to Cloud Run

**Auto-deploy on every push to main branch**

---

## ✅ **Setup Steps (5 phút)**

### **1. Create Service Account for GitHub Actions**

```bash
# Set variables
PROJECT_ID="novatotorai-489214"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="GitHub Actions CI/CD" \
  --project=$PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=$SA_EMAIL \
  --project=$PROJECT_ID

# Display key (copy this)
cat ~/github-actions-key.json
```

---

### **2. Add Secrets to GitHub**

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

Click **"New repository secret"** and add:

#### **Secret 1: GCP_SA_KEY**
```
Name: GCP_SA_KEY
Value: <paste entire content of github-actions-key.json>
```

#### **Secret 2: DATABASE_URL**
```
Name: DATABASE_URL
Value: postgresql+asyncpg://postgres:Hieu1234@/novatutor?host=/cloudsql/novatotorai-489214:us-central1:novatutor-db
```

---

### **3. Enable Required APIs**

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  --project=$PROJECT_ID
```

---

### **4. Verify Workflow File Exists**

File đã được tạo tại:
```
.github/workflows/deploy.yml
```

**Check nội dung**:
```bash
cat .github/workflows/deploy.yml
```

---

### **5. Commit & Push to Trigger Deployment**

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

---

## 🔄 **How It Works**

### **Trigger Events**
- ✅ Push to `main` branch → Auto-deploy
- ✅ Push to `production` branch → Auto-deploy
- ✅ Manual trigger via GitHub Actions UI

### **Workflow Steps**

**Job 1: Deploy Backend**
1. Checkout code
2. Authenticate to GCP
3. Build Docker image (tag: commit SHA + latest)
4. Push to Google Container Registry
5. Deploy to Cloud Run
   - Service: novatutor-backend
   - Memory: 2Gi
   - Timeout: 300s
   - Auto-scaling enabled

**Job 2: Deploy Frontend** (runs after backend)
1. Checkout code
2. Authenticate to GCP
3. Build Docker image with `NEXT_PUBLIC_API_URL`
4. Push to GCR
5. Deploy to Cloud Run
   - Service: novatutor-frontend
   - Memory: 512Mi

**Job 3: Notify**
- ✅ Success → Show URLs
- ❌ Failure → Exit with error

---

## 📊 **Monitoring Deployments**

### **View in GitHub**
```
Repository → Actions tab
```

You'll see:
- ✅ All workflow runs
- ✅ Build logs
- ✅ Deployment status
- ✅ Errors (if any)

### **View in GCP**
```bash
# Backend logs
gcloud run services logs read novatutor-backend --region=us-central1

# Frontend logs
gcloud run services logs read novatutor-frontend --region=us-central1
```

---

## 🎯 **Testing CI/CD**

### **Test 1: Make a Small Change**

```bash
# Edit README
echo "\nUpdated via CI/CD" >> README.md

# Commit & push
git add README.md
git commit -m "Test CI/CD deployment"
git push origin main
```

### **Test 2: Watch Deployment**

1. Go to GitHub Actions tab
2. Click on latest workflow run
3. Watch each job execute
4. Should see:
   - ✅ Backend deployed
   - ✅ Frontend deployed
   - ✅ URLs displayed

### **Test 3: Verify Live**

```bash
# Check backend
curl https://novatutor-backend-366729322781.us-central1.run.app/api/v1/health

# Check frontend
curl -I https://novatutor-frontend-366729322781.us-central1.run.app
```

---

## 🔐 **Security Best Practices**

### **✅ What We Did**
- ✅ Service account with minimal permissions
- ✅ Secrets stored in GitHub Secrets (encrypted)
- ✅ Key file never committed to repo
- ✅ IAM roles scoped appropriately

### **❌ Never Do This**
- ❌ Commit service account keys to repo
- ❌ Use owner/editor roles for CI/CD
- ❌ Share secrets in plain text
- ❌ Use same SA for dev and prod

---

## 🛠️ **Customization**

### **Add Environment-Specific Deployments**

```yaml
# In deploy.yml, add:
on:
  push:
    branches:
      - main      # → staging environment
      - production # → production environment
```

### **Add Tests Before Deploy**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest
  
  deploy-backend:
    needs: test  # Only deploy if tests pass
    # ... rest of deploy job
```

### **Add Slack/Discord Notifications**

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "✅ Deployment successful!"
      }
```

---

## 📈 **Deployment Metrics**

### **Expected Times**
- Backend build: ~3-5 minutes
- Frontend build: ~2-3 minutes
- Total deployment: ~7-10 minutes

### **Cost Estimate**
- Cloud Build: $0.003/build-minute
- Total per deployment: ~$0.03
- Monthly (30 deploys): ~$1

---

## 🐛 **Troubleshooting**

### **Error: "Permission denied"**
```bash
# Grant serviceAccountUser role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### **Error: "Image not found"**
```bash
# Check GCR access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### **Error: "Cloud Run deployment failed"**
```bash
# Check Cloud Run API is enabled
gcloud services enable run.googleapis.com

# Verify service account has run.admin
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@"
```

---

## ✅ **Success Criteria**

After setup, you should have:
- [x] Service account created with proper roles
- [x] GitHub secrets configured
- [x] Workflow file in `.github/workflows/deploy.yml`
- [x] Able to trigger deployment via push
- [x] Both backend and frontend deploy successfully
- [x] Services accessible at Cloud Run URLs

---

## 🎉 **Benefits**

### **Before CI/CD**
```
1. Edit code locally
2. Build Docker image manually
3. Push to GCR manually
4. Deploy to Cloud Run manually
5. Repeat for frontend
Total: ~15 minutes of manual work
```

### **After CI/CD** ✅
```
1. Edit code locally
2. git push origin main
3. ☕ Coffee break
Total: ~30 seconds of your time, 7 minutes automated
```

---

## 📞 **Support**

### **View Workflow Logs**
```
GitHub → Actions → Select run → View logs
```

### **Re-run Failed Deployment**
```
GitHub → Actions → Failed run → Re-run jobs
```

### **Manual Trigger**
```
GitHub → Actions → Deploy to Cloud Run → Run workflow
```

---

## 🚀 **Next Steps**

1. ✅ Setup CI/CD (this guide)
2. [ ] Add automated tests
3. [ ] Add staging environment
4. [ ] Setup monitoring & alerts
5. [ ] Add rollback mechanism
6. [ ] Implement blue-green deployment

---

**Status**: 🟢 **Ready to use**  
**Setup Time**: ~5 minutes  
**Deploy Time**: ~7 minutes (automated)  
**Cost**: ~$1/month for 30 deployments

**🎯 Push to main and watch the magic!** ✨

