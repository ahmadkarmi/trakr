Write-Host "`n=== Verifying DashboardAuditor.tsx Changes ===" -ForegroundColor Cyan

$dashFile = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$cardFile = "d:\Dev\Apps\Trakr\apps\web\src\components\MobileAuditCard.tsx"

Write-Host "`n1. Checking MobileAuditCard import..." -ForegroundColor Yellow
$content = Get-Content -Raw $dashFile
if ($content -match 'import MobileAuditCard from') {
  Write-Host "   ✓ MobileAuditCard import EXISTS" -ForegroundColor Green
} else {
  Write-Host "   ✗ MobileAuditCard import MISSING" -ForegroundColor Red
}

Write-Host "`n2. Checking scheduled section uses MobileAuditCard..." -ForegroundColor Yellow
if ($content -match '<MobileAuditCard[\s\S]*?mode="scheduled"') {
  Write-Host "   ✓ Scheduled section uses MobileAuditCard" -ForegroundColor Green
} else {
  Write-Host "   ✗ Scheduled section does NOT use MobileAuditCard" -ForegroundColor Red
}

Write-Host "`n3. Checking MobileAuditCard.tsx exists and has w-full..." -ForegroundColor Yellow
if (Test-Path $cardFile) {
  Write-Host "   ✓ MobileAuditCard.tsx file EXISTS" -ForegroundColor Green
  $cardContent = Get-Content -Raw $cardFile
  if ($cardContent -match 'className="w-full bg-white') {
    Write-Host "   ✓ MobileAuditCard has w-full class" -ForegroundColor Green
  } else {
    Write-Host "   ✗ MobileAuditCard missing w-full class" -ForegroundColor Red
  }
} else {
  Write-Host "   ✗ MobileAuditCard.tsx file NOT FOUND" -ForegroundColor Red
}

Write-Host "`n4. Checking for JSX syntax errors..." -ForegroundColor Yellow
if ($content -match '</div>/\*') {
  Write-Host "   ✗ Found inline comment after closing div (JSX error)" -ForegroundColor Red
} else {
  Write-Host "   ✓ No inline comments found" -ForegroundColor Green
}

Write-Host "`n5. TypeScript check..." -ForegroundColor Yellow
Push-Location "d:\Dev\Apps\Trakr\apps\web"
$tscOutput = & npx tsc --noEmit 2>&1 | Out-String
Pop-Location
if ($tscOutput -match 'error TS') {
  Write-Host "   ✗ TypeScript errors found:" -ForegroundColor Red
  Write-Host $tscOutput
} else {
  Write-Host "   ✓ No TypeScript errors" -ForegroundColor Green
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
