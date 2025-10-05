$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content -Raw -LiteralPath $path

# 1) Fix misplaced inline comment after closing div
$pattern = '(?m)^(\s*)</div>/\* Desktop table \*/\}'
$replacement = '$1</div>' + "`r`n" + '$1{/* Desktop table */}'
$content = [regex]::Replace($content, $pattern, $replacement)

# 2) Fix broken navigate calls caused by earlier replace
$content = $content.Replace('onSummary={() => navigate(/audits//summary)}', "onSummary={() => navigate('/audits/' + a.id + '/summary')}")
$content = $content.Replace('onOpen={() => navigate(/audit//wizard)}', "onOpen={() => navigate('/audit/' + a.id + '/wizard')}")

# 3) Normalize corrupted dash characters
$content = $content -replace 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â','—'
$content = $content -replace 'Ã¢â‚¬â€�','—'
$content = $content -replace 'Ã¢â‚¬â€œ','–'

# 4) Trim any duplicated opening brace before the scheduled comment (defensive)
$content = [regex]::Replace($content, '(?m)^\s*\{\s*\{?/\* Mobile-First Scheduled Cards \*/\}', '                  {/* Mobile-First Scheduled Cards */}')

Set-Content -LiteralPath $path -Value $content -NoNewline
Write-Host "✅ Patched DashboardAuditor.tsx JSX and navigation strings." -ForegroundColor Green
