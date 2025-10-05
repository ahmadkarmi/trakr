Write-Host "`n=== Quick Verification ===" -ForegroundColor Cyan

$dashFile = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$cardFile = "d:\Dev\Apps\Trakr\apps\web\src\components\MobileAuditCard.tsx"

Write-Host "`n1. MobileAuditCard import check..." -ForegroundColor Yellow
$dashContent = Get-Content -Raw $dashFile
if ($dashContent -match 'import MobileAuditCard') {
  Write-Host "   OK - Import exists" -ForegroundColor Green
} else {
  Write-Host "   FAIL - Import missing" -ForegroundColor Red
}

Write-Host "`n2. Scheduled section check..." -ForegroundColor Yellow
if ($dashContent -match '<MobileAuditCard[\s\S]{1,500}mode="scheduled"') {
  Write-Host "   OK - Uses MobileAuditCard with scheduled mode" -ForegroundColor Green
} else {
  Write-Host "   FAIL - Not using component" -ForegroundColor Red
}

Write-Host "`n3. MobileAuditCard file check..." -ForegroundColor Yellow
if (Test-Path $cardFile) {
  $cardContent = Get-Content -Raw $cardFile
  if ($cardContent -match 'className="w-full') {
    Write-Host "   OK - Has w-full class" -ForegroundColor Green
  } else {
    Write-Host "   FAIL - Missing w-full" -ForegroundColor Red
  }
} else {
  Write-Host "   FAIL - File not found" -ForegroundColor Red
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
