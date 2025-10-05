$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content -Raw -LiteralPath $path

# Fix misplaced inline comment and stray brace after closing div
$pattern = '(?m)^(\s*)</div>/\* Desktop table \*/\}?$'
$replacement = '$1</div>' + "`r`n" + '$1{/* Desktop table */}'
$content = [regex]::Replace($content, $pattern, $replacement)

# Defensive: remove any stray brace before the scheduled comment line
$pattern2 = '(?m)^(\s*)\{\s*\{?/\* Mobile-First Scheduled Cards \*/\}'
$replacement2 = '$1{/* Mobile-First Scheduled Cards */}'
$content = [regex]::Replace($content, $pattern2, $replacement2)

Set-Content -LiteralPath $path -Value $content -NoNewline
Write-Host "✅ Fixed JSX comment placement and stray brace in DashboardAuditor.tsx" -ForegroundColor Green
