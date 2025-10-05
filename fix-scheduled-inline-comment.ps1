$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = Get-Content -LiteralPath $path
$out = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
  if ($line -match '^\s*</div>/\* Desktop table \*/\}$') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $out.Add($indent + '</div>')
    $out.Add($indent + '{/* Desktop table */}')
  }
  else {
    $out.Add($line)
  }
}
[System.IO.File]::WriteAllLines($path, $out)
Write-Host "✅ Fixed inline desktop table comment placement." -ForegroundColor Green
