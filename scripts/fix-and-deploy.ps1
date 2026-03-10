#!/usr/bin/env pwsh
# Quick Fix Deploy - Inject API URL into frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix & Redeploy Frontend with API URL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$SERVICE = "novatutor-frontend"
$IMAGE = "gcr.io/{0}/{1}:fixed" -f $PROJECT_ID, $SERVICE
$API_URL = "https://novatutor-backend-366729322781.us-central1.run.app/api/v1"

cd C:\Users\HIEU\PycharmProjects\NovaTutor_AI\frontend

Write-Host "✓ Step 1: Building Docker image with API_URL..." -ForegroundColor Yellow
Write-Host "   API_URL: $API_URL" -ForegroundColor Gray

docker build `
  --build-arg NEXT_PUBLIC_API_URL=$API_URL `
  -t $IMAGE .

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Build failed" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green

Write-Host ""
Write-Host "✓ Step 2: Pushing to GCR..." -ForegroundColor Yellow

docker push $IMAGE

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Push failed" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Push successful" -ForegroundColor Green

Write-Host ""
Write-Host "✓ Step 3: Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $SERVICE `
  --image=$IMAGE `
  --region=$REGION `
  --allow-unauthenticated `
  --project=$PROJECT_ID

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Deployment failed" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT FIXED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$URL = gcloud run services describe $SERVICE --region=$REGION --project=$PROJECT_ID --format="value(status.url)"

Write-Host "🌐 Frontend URL: $URL" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Frontend now connects to: $API_URL" -ForegroundColor Green
Write-Host ""
Write-Host "Test login again at: ${URL}/auth" -ForegroundColor Yellow
Write-Host ""


