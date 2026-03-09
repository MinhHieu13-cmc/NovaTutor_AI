#!/usr/bin/env pwsh
# Security check script - Run before git push

Write-Host ""
Write-Host "🔐 Security Check - Scanning for sensitive files..." -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Check 1: Git tracked sensitive files
Write-Host "[1/4] Checking git tracked files..." -ForegroundColor Yellow
$trackedSensitive = git ls-files | Select-String -Pattern "\.env$|\.env\.|key\.json$|\.pem$|\.p12$|credentials"
if ($trackedSensitive) {
    Write-Host "  ❌ CRITICAL: Sensitive files are tracked in git:" -ForegroundColor Red
    $trackedSensitive | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
    $errors++
} else {
    Write-Host "  ✅ No sensitive files tracked" -ForegroundColor Green
}

# Check 2: Staged files
Write-Host "[2/4] Checking staged files..." -ForegroundColor Yellow
$staged = git diff --cached --name-only | Select-String -Pattern "\.env|key\.json|\.pem|\.p12|password|secret"
if ($staged) {
    Write-Host "  ❌ WARNING: Sensitive files are staged:" -ForegroundColor Red
    $staged | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
    $errors++
} else {
    Write-Host "  ✅ No sensitive files staged" -ForegroundColor Green
}

# Check 3: Untracked sensitive files exist
Write-Host "[3/4] Checking for untracked sensitive files..." -ForegroundColor Yellow
$untracked = @()
if (Test-Path ".env") { $untracked += ".env" }
if (Test-Path ".env.local") { $untracked += ".env.local" }
if (Test-Path ".env.gcp") { $untracked += ".env.gcp" }
if (Test-Path "backend-key.json") { $untracked += "backend-key.json" }
if (Test-Path "github-actions-key.json") { $untracked += "github-actions-key.json" }

if ($untracked.Count -gt 0) {
    Write-Host "  ℹ️  Found untracked sensitive files (OK if in .gitignore):" -ForegroundColor Yellow
    $untracked | ForEach-Object { Write-Host "     - $_" -ForegroundColor Yellow }
} else {
    Write-Host "  ✅ No untracked sensitive files" -ForegroundColor Green
}

# Check 4: Verify .gitignore has rules
Write-Host "[4/4] Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    $requiredPatterns = @(".env", "*.key.json", "*.pem")
    $missing = @()

    foreach ($pattern in $requiredPatterns) {
        if (-not ($gitignoreContent -match [regex]::Escape($pattern))) {
            $missing += $pattern
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host "  ⚠️  Missing patterns in .gitignore:" -ForegroundColor Yellow
        $missing | ForEach-Object { Write-Host "     - $_" -ForegroundColor Yellow }
    } else {
        Write-Host "  ✅ .gitignore has security patterns" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  .gitignore not found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
if ($errors -gt 0) {
    Write-Host "═══════════════════════════════════════" -ForegroundColor Red
    Write-Host "❌ SECURITY CHECK FAILED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  DO NOT PUSH TO GITHUB!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix the issues above before pushing." -ForegroundColor Yellow
    Write-Host "See internal/security/SECURITY_CHECKLIST.md for help." -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "═══════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ SECURITY CHECK PASSED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Safe to push to GitHub!" -ForegroundColor Green
    Write-Host ""
    exit 0
}
