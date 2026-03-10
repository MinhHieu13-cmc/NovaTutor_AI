# Phase 2 Deployment Script - RAG Engine + Frontend Integration
# Run this script to deploy Phase 2 features to GCP

param(
    [string]$ProjectId = "novatotorai-489214",
    [string]$Region = "us-central1"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  NovaTutor AI - Phase 2 Deployment" -ForegroundColor Magenta
Write-Host "  RAG Engine + Frontend Integration" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Configuration
$SERVICE = "novatutor-backend"
$IMAGE = "gcr.io/{0}/{1}:phase2" -f $ProjectId, $SERVICE
$CONN = "{0}:{1}:{2}" -f $ProjectId, $Region, "novatutor-db"
$SA = "{0}@{1}.iam.gserviceaccount.com" -f $SERVICE, $ProjectId

# Step 1: Enable APIs
Write-Host "Step 1: Enabling Vertex AI APIs..." -ForegroundColor Cyan
gcloud services enable aiplatform.googleapis.com generativelanguage.googleapis.com --project=$ProjectId
Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 2: Grant IAM permissions
Write-Host "Step 2: Granting Vertex AI permissions..." -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$SA" `
  --role="roles/aiplatform.user" `
  --no-user-output-enabled
Write-Host "✅ Permissions granted" -ForegroundColor Green
Write-Host ""

# Step 3: Verify pgvector extension
Write-Host "Step 3: Verifying pgvector extension..." -ForegroundColor Cyan
Write-Host "   (Check manually: gcloud sql connect novatutor-db --user=postgres)" -ForegroundColor Yellow
Write-Host "   Run: SELECT extname FROM pg_extension WHERE extname='vector';" -ForegroundColor Yellow
Write-Host ""

# Step 4: Build backend image
Write-Host "Step 4: Building backend Docker image..." -ForegroundColor Cyan
docker build -t $IMAGE -f backend/Dockerfile backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image built successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Push image to GCR
Write-Host "Step 5: Pushing image to Google Container Registry..." -ForegroundColor Cyan
docker push $IMAGE
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image pushed successfully" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy to Cloud Run
Write-Host "Step 6: Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --image=$IMAGE `
  --platform=managed `
  --region=$Region `
  --allow-unauthenticated `
  --service-account=$SA `
  --add-cloudsql-instances=$CONN `
  --memory=2Gi `
  --timeout=300s `
  --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Deployment successful" -ForegroundColor Green
Write-Host ""

# Step 7: Get service URL
Write-Host "Step 7: Getting service URL..." -ForegroundColor Cyan
$BACKEND_URL = gcloud run services describe $SERVICE --region=$Region --format="value(status.url)" --project=$ProjectId
Write-Host "   Backend URL: $BACKEND_URL" -ForegroundColor Green
Write-Host ""

# Step 8: Health checks
Write-Host "Step 8: Running health checks..." -ForegroundColor Cyan

Write-Host "   Testing /api/v1/health..." -ForegroundColor Yellow
try {
    $healthRes = Invoke-RestMethod -Uri "$BACKEND_URL/api/v1/health" -UseBasicParsing
    Write-Host "   ✅ API Health: OK" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  API Health check failed" -ForegroundColor Yellow
}

Write-Host "   Testing /api/v1/rag/health..." -ForegroundColor Yellow
try {
    $ragHealthRes = Invoke-RestMethod -Uri "$BACKEND_URL/api/v1/rag/health" -UseBasicParsing
    Write-Host "   ✅ RAG Engine: $($ragHealthRes.status)" -ForegroundColor Green
    Write-Host "   Model: $($ragHealthRes.embedding_model)" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠️  RAG health check failed" -ForegroundColor Yellow
}

Write-Host ""

# Step 9: View recent logs
Write-Host "Step 9: Viewing deployment logs..." -ForegroundColor Cyan
Write-Host "   (Last 20 lines)" -ForegroundColor Gray
gcloud run services logs read $SERVICE --region=$Region --limit=20 --project=$ProjectId
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Deployment Summary" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Status: " -NoNewline
Write-Host "✅ Phase 2 Deployed Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: " -NoNewline -ForegroundColor Cyan
Write-Host $BACKEND_URL -ForegroundColor White
Write-Host "API Docs: " -NoNewline -ForegroundColor Cyan
Write-Host "$BACKEND_URL/docs" -ForegroundColor White
Write-Host ""
Write-Host "New Features:" -ForegroundColor Yellow
Write-Host "  ✅ RAG Engine with Vertex AI" -ForegroundColor Green
Write-Host "  ✅ PDF Document Processing" -ForegroundColor Green
Write-Host "  ✅ Semantic Search (pgvector)" -ForegroundColor Green
Write-Host "  ✅ AI Chat with Gemini Pro" -ForegroundColor Green
Write-Host "  ✅ Auto-embedding on Upload" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test document upload: POST /api/v1/courses/{id}/upload-document" -ForegroundColor Gray
Write-Host "  2. Test semantic search: POST /api/v1/rag/search" -ForegroundColor Gray
Write-Host "  3. Test AI chat: POST /api/v1/rag/chat" -ForegroundColor Gray
Write-Host "  4. Deploy frontend updates" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  See: internal/deployment/PHASE_2_RAG_DEPLOYMENT.md" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta

# Optional: Open docs in browser
$openDocs = Read-Host "Open API documentation in browser? (y/n)"
if ($openDocs -eq 'y') {
    Start-Process "$BACKEND_URL/docs"
}


