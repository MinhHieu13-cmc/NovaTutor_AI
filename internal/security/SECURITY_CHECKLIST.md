# Security Checklist for GitHub Push

## ✅ Pre-Push Security Verification

Before pushing to GitHub, verify these items:

### 1. Sensitive Files Check

Run this command to check for sensitive files:
```powershell
git status --porcelain | Select-String -Pattern "\.(env|key|json|pem|p12)$|password|secret|token|credential"
```

Expected: Should NOT show `.env`, `*-key.json`, or credential files.

### 2. Git Status Verification

```powershell
git status
```

Verify that these files are **NOT** staged:
- [ ] `.env` or `.env.*`
- [ ] `backend-key.json`
- [ ] `github-actions-key.json`
- [ ] Any `*-key.json` files
- [ ] Any `*.pem` or `*.p12` files

### 3. Tracked Files Check

```powershell
git ls-files | Select-String -Pattern "\.env|password|secret|key\.json|credential"
```

Expected: Should return EMPTY (no sensitive files tracked).

### 4. Verify .gitignore

Ensure `.gitignore` contains:
```
.env
.env.*
*.key.json
*-key.json
*.pem
*.p12
*credentials*.json
*service-account*.json
```

### 5. Example Files Present

Verify template files exist (safe to commit):
- [ ] `.env.example` (with placeholder values)
- [ ] `README.md` mentions how to setup `.env`

## 🔒 Files That MUST NOT Be Committed

### Critical (Contains Real Credentials)
- ❌ `.env` - Contains real API keys and passwords
- ❌ `.env.local`, `.env.gcp`, `.env.production`
- ❌ `backend-key.json` - GCP service account key
- ❌ `github-actions-key.json` - CI/CD service account key
- ❌ Any `*-key.json` files
- ❌ `*.pem`, `*.p12`, `*.crt` - Certificates and private keys

### Safe to Commit (Templates/Examples)
- ✅ `.env.example` - Template with placeholder values
- ✅ `README.md` - Documentation
- ✅ `.gitignore` - Git ignore rules
- ✅ Workflow files (`.github/workflows/*.yml`)

## 🛡️ If You Accidentally Committed Secrets

If you already committed sensitive files:

### Option 1: Remove from last commit (not pushed yet)
```powershell
git reset HEAD~1
git add .gitignore
git add . --except .env backend-key.json github-actions-key.json
git commit -m "Add project files (secure)"
```

### Option 2: Remove from history (already pushed)
```powershell
# Remove file from git history
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: rewrites history)
git push origin --force --all
```

### Option 3: Use BFG Repo-Cleaner (recommended for large repos)
```powershell
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

### CRITICAL: Rotate All Exposed Secrets
If secrets were pushed to GitHub:
1. **Immediately rotate all API keys**:
   - Gemini API key → https://ai.google.dev
   - OpenAI API key → https://platform.openai.com
   - GCP service account keys → Delete and recreate
2. **Change database passwords**:
   ```powershell
   gcloud sql users set-password novatutor-user --instance=novatutor-db --password=NEW_PASSWORD
   ```
3. **Revoke and recreate GitHub secrets**
4. **Update local `.env` with new credentials**

## 📋 Safe Push Checklist

Before `git push`, verify:
- [ ] Run security check command
- [ ] No `.env` files in `git status`
- [ ] No `*-key.json` files in `git status`
- [ ] `.gitignore` updated with sensitive patterns
- [ ] `.env.example` exists with placeholders
- [ ] No real API keys visible in code or docs
- [ ] GitHub Secrets configured (not in code)

## 🔍 Automated Check Script

Save as `check-secrets.ps1`:
```powershell
Write-Host "🔍 Checking for sensitive files..." -ForegroundColor Yellow

$sensitivePatterns = @(".env", "*.key.json", "*.pem", "*.p12")
$found = $false

foreach ($pattern in $sensitivePatterns) {
    $files = git ls-files $pattern 2>$null
    if ($files) {
        Write-Host "❌ DANGER: Found tracked sensitive files matching '$pattern'" -ForegroundColor Red
        $files | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
        $found = $true
    }
}

if (-not $found) {
    Write-Host "✅ No sensitive files tracked in git" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  DO NOT PUSH! Remove sensitive files first." -ForegroundColor Red
    exit 1
}
```

Run before push:
```powershell
.\check-secrets.ps1
git push
```

## 📚 References

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Filter-Branch](https://git-scm.com/docs/git-filter-branch)

