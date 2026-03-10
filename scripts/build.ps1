# Build script for NovaTutor Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NovaTutor Frontend Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

cd C:\Users\HIEU\PycharmProjects\NovaTutor_AI\frontend

Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Write-Host "Start time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Run build
$startTime = Get-Date
npm run build
$exitCode = $LASTEXITCODE
$duration = ((Get-Date) - $startTime).TotalSeconds

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Result" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($exitCode -eq 0) {
  Write-Host "✅ BUILD SUCCESSFUL" -ForegroundColor Green
  Write-Host "Duration: $([Math]::Round($duration, 2))s" -ForegroundColor Gray

  if (Test-Path .next) {
    Write-Host "✅ Output folder: .next" -ForegroundColor Green
    $size = (Get-ChildItem -Path .next -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Size: $([Math]::Round($size, 2)) MB" -ForegroundColor Gray
  } else {
    Write-Host "⚠️  .next folder not found" -ForegroundColor Yellow
  }
} else {
  Write-Host "❌ BUILD FAILED" -ForegroundColor Red
  Write-Host "Exit code: $exitCode" -ForegroundColor Red
  exit $exitCode
}

Write-Host ""
Write-Host "✅ Ready to deploy!" -ForegroundColor Green

