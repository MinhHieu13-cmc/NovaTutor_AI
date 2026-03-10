#!/usr/bin/env pwsh
# Complete Fix & Deploy - Auth Page with authService

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Login Fix v2 - Complete Deployment" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$SERVICE = "novatutor-frontend"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE:fixed2"

Write-Host "Waiting for Docker build to complete..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C if build already done" -ForegroundColor Gray
Write-Host ""

# Wait for build
Start-Sleep -Seconds 120

Write-Host "Step 1/3: Pushing image to GCR..." -ForegroundColor Cyan
docker push $IMAGE

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Push failed - is build complete?" -ForegroundColor Red
  Write-Host "Check: docker images | findstr fixed2" -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ Push successful" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2/3: Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --image=$IMAGE `
  --region=$REGION `
  --allow-unauthenticated `
  --project=$PROJECT_ID

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Deployment failed" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Deployment successful" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3/3: Verifying..." -ForegroundColor Cyan
$URL = gcloud run services describe $SERVICE --region=$REGION --project=$PROJECT_ID --format="value(status.url)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ FIX v2 COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend URL: $URL" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Test Instructions:" -ForegroundColor Yellow
Write-Host "1. Open: ${URL}/auth" -ForegroundColor Gray
Write-Host "2. Login with: teacher04@example.com / Test@123456" -ForegroundColor Gray
Write-Host "3. Should redirect to /dashboard/teacher" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Check browser console - should see backend URL, not /api/v1/login" -ForegroundColor Green
Write-Host ""

