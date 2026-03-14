# NovaTutor AI - GCP Deployment Script
# Usage: .\scripts\deployment\deploy-gcp.ps1 -ProjectId novatotorai-489214 -Region us-central1

param(
    [string]$ProjectId = "novatotorai-489214",
    [string]$Region = "us-central1",
    [string]$DbPassword = "novatutorai_db_pass_2024",
    [string]$DbUserPassword = "novatutorai_user_pass_2024",
    [string]$GeminiApiKey = ""
)

$ErrorActionPreference = "Stop"

# Colors for output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

function Write-Status {
    param([string]$Message, [string]$Status)
    Write-Host "[$Status] $Message"
}

# 1. Set Project
Write-Status "Setting GCP project to $ProjectId" "INFO"
gcloud config set project $ProjectId

# 2. Enable required APIs
Write-Status "Enabling required GCP APIs..." "INFO"
$apis = @(
    "aiplatform.googleapis.com",
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "container.googleapis.com"
)

foreach ($api in $apis) {
    Write-Status "Enabling $api" "PROCESSING"
    gcloud services enable $api --quiet
}

# 3. Create Cloud SQL Instance
Write-Status "Creating Cloud SQL PostgreSQL instance..." "INFO"
$sqlInstance = "novatutor-db"

try {
    $exists = gcloud sql instances describe $sqlInstance --quiet 2>&1
    Write-Status "Cloud SQL instance '$sqlInstance' already exists" "SKIP"
} catch {
    Write-Status "Creating Cloud SQL instance..." "PROCESSING"
    gcloud sql instances create $sqlInstance `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=$Region `
        --root-password=$DbPassword `
        --quiet

    Write-Status "Cloud SQL instance created" "SUCCESS"
}

# 4. Create database and user
Write-Status "Setting up database and user..." "INFO"

gcloud sql databases create novatutor `
    --instance=$sqlInstance `
    --quiet 2>$null

gcloud sql users create novatutor-user `
    --instance=$sqlInstance `
    --password=$DbUserPassword `
    --quiet 2>$null

Write-Status "Database and user created" "SUCCESS"

# 5. Enable pgvector extension
Write-Status "Creating initialization script for pgvector..." "INFO"
$initSql = @"
CREATE EXTENSION IF NOT EXISTS vector;
"@

$initSql | Set-Content -Path ".\scripts\init_pgvector.sql"
Write-Status "Initialization script created at scripts/init_pgvector.sql" "SUCCESS"

# 6. Create service account for backend
Write-Status "Creating GCP service account for backend..." "INFO"
$serviceAccount = "novatutor-backend"
$saEmail = "$serviceAccount@$ProjectId.iam.gserviceaccount.com"

try {
    gcloud iam service-accounts describe $saEmail --quiet 2>$null
    Write-Status "Service account already exists" "SKIP"
} catch {
    gcloud iam service-accounts create $serviceAccount `
        --description="Service account for NovaTutor backend" `
        --display-name="NovaTutor Backend" `
        --quiet

    Write-Status "Service account created" "SUCCESS"
}

# 7. Grant IAM roles
Write-Status "Granting IAM roles to service account..." "INFO"
$roles = @(
    "roles/aiplatform.user",
    "roles/cloudsql.client",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter"
)

foreach ($role in $roles) {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$saEmail" `
        --role=$role `
        --quiet 2>$null
}

Write-Status "IAM roles granted" "SUCCESS"

# 8. Create and download service account key
Write-Status "Creating service account key..." "INFO"
$keyPath = ".\backend-key.json"

if (Test-Path $keyPath) {
    Write-Status "Key file already exists at $keyPath" "SKIP"
} else {
    gcloud iam service-accounts keys create $keyPath `
        --iam-account=$saEmail `
        --quiet

    Write-Status "Service account key created at $keyPath" "SUCCESS"
}

# 9. Create .env file for deployment
Write-Status "Creating .env file for GCP deployment..." "INFO"

$cloudSqlConn = "$ProjectId`:$Region`:$sqlInstance"
$envContent = @"
# GCP Configuration
GCP_PROJECT_ID=$ProjectId
GCP_LOCATION=$Region
GCP_PROJECT_CONN_NAME=$cloudSqlConn

# Database
DATABASE_URL=postgresql+asyncpg://novatutor-user:$DbUserPassword@/novatutor?host=/cloudsql/$cloudSqlConn

# API Keys
GOOGLE_API_KEY=$GeminiApiKey

# LLM Provider
LLM_PROVIDER=google

# Deployment
DEBUG=false
"@

$envContent | Set-Content -Path ".\.env.gcp"
Write-Status ".env.gcp file created" "SUCCESS"

# 10. Build and push backend Docker image
Write-Status "Building backend Docker image..." "INFO"

$backendImage = "gcr.io/$ProjectId/novatutor-backend:latest"

Write-Status "Authenticating with Container Registry..." "PROCESSING"
gcloud auth configure-docker gcr.io

Write-Status "Building Docker image: $backendImage" "PROCESSING"
docker build -t $backendImage -f backend/Dockerfile backend/

Write-Status "Pushing image to GCR..." "PROCESSING"
docker push $backendImage

Write-Status "Backend image pushed successfully" "SUCCESS"

# 11. Build and push frontend Docker image
Write-Status "Building frontend Docker image..." "INFO"

$frontendImage = "gcr.io/$ProjectId/novatutor-frontend:latest"

Write-Status "Building Docker image: $frontendImage" "PROCESSING"
docker build -t $frontendImage -f frontend/Dockerfile frontend/

Write-Status "Pushing image to GCR..." "PROCESSING"
docker push $frontendImage

Write-Status "Frontend image pushed successfully" "SUCCESS"

# 12. Deploy backend to Cloud Run
Write-Status "Deploying backend to Cloud Run..." "INFO"

$cloudRunService = "novatutor-backend"
$deployDbUrl = "postgresql+asyncpg://novatutor-user:$DbUserPassword@/novatutor?host=/cloudsql/$cloudSqlConn"

gcloud run deploy $cloudRunService `
    --image=$backendImage `
    --platform=managed `
    --region=$Region `
    --allow-unauthenticated `
    --add-cloudsql-instances=$cloudSqlConn `
    --set-env-vars="DATABASE_URL=$deployDbUrl,GCP_PROJECT_ID=$ProjectId,DEBUG=false" `
    --service-account=$saEmail `
    --memory=2Gi `
    --cpu=2 `
    --timeout=3600 `
    --quiet

if ($LASTEXITCODE -ne 0) { throw "Backend deployment failed" }

Write-Status "Backend deployed to Cloud Run" "SUCCESS"

# Get backend URL
$backendUrl = gcloud run services describe $cloudRunService --region=$Region --format='value(status.url)' --quiet

Write-Status "Backend URL: $backendUrl" "SUCCESS"

# 13. Deploy frontend to Cloud Run
Write-Status "Deploying frontend to Cloud Run..." "INFO"

$cloudRunFrontend = "novatutor-frontend"

gcloud run deploy $cloudRunFrontend `
    --image=$frontendImage `
    --platform=managed `
    --region=$Region `
    --allow-unauthenticated `
    --set-env-vars="NEXT_PUBLIC_API_URL=$backendUrl" `
    --memory=1Gi `
    --cpu=1 `
    --timeout=3600 `
    --quiet

Write-Status "Frontend deployed to Cloud Run" "SUCCESS"

# Get frontend URL
$frontendUrl = gcloud run services describe $cloudRunFrontend --region=$Region --format='value(status.url)' --quiet

Write-Status "Frontend URL: $frontendUrl" "SUCCESS"

# Summary
Write-Host ""
Write-Host "============================================================"
Write-Host "Deployment Complete"
Write-Host ""
Write-Host "Backend:  $backendUrl"
Write-Host "Frontend: $frontendUrl"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Add your Gemini API key if not provided"
Write-Host "2. Connect to Cloud SQL and run: CREATE EXTENSION IF NOT EXISTS vector;"
Write-Host "3. Test the application at: $frontendUrl"
Write-Host "============================================================"
