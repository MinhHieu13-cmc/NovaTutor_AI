# Deploy frontend to Cloud Run - No Docker Required
# Using Cloud Run container image from Node.js runtime

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NovaTutor Frontend - Quick Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$SERVICE = "novatutor-frontend"

Write-Host "📦 Step 1: Prepare deployment..." -ForegroundColor Yellow

# Check if Docker is available
try {
  $dockerCheck = docker ps 2>&1
  if ($dockerCheck -match "error" -or $dockerCheck -match "cannot") {
    Write-Host "⚠️  Docker not available. Using gcloud deploy instead." -ForegroundColor Yellow
    $useDocker = $false
  } else {
    Write-Host "✅ Docker available" -ForegroundColor Green
    $useDocker = $true
  }
} catch {
  Write-Host "⚠️  Docker daemon not running" -ForegroundColor Yellow
  $useDocker = $false
}

if ($useDocker) {
  Write-Host ""
  Write-Host "📦 Step 2: Build Docker image..." -ForegroundColor Yellow
  $IMAGE = "gcr.io/$PROJECT_ID/$SERVICE:latest"

  docker build -t $IMAGE .
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
  }

  Write-Host "📤 Step 3: Push to Google Container Registry..." -ForegroundColor Yellow
  docker push $IMAGE
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "⚠️  Skipping Docker - will use gcloud to build" -ForegroundColor Yellow
  $IMAGE = "gcr.io/$PROJECT_ID/$SERVICE:latest"
}

Write-Host ""
Write-Host "🚀 Step 4: Deploy to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $SERVICE `
  --source . `
  --region=$REGION `
  --allow-unauthenticated `
  --runtime=nodejs18 `
  --entry-point="npm run start" `
  --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
  Write-Host ""

  $URL = gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
  Write-Host "🌐 Frontend URL: $URL" -ForegroundColor Green
  Write-Host ""
  Write-Host "Backend URL: https://novatutor-backend-366729322781.us-central1.run.app" -ForegroundColor Gray

} else {
  Write-Host "❌ Deployment failed" -ForegroundColor Red
  exit 1
}

