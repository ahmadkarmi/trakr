$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = [System.IO.File]::ReadAllLines($path)

$updated = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Length; $i++) {
  $line = $lines[$i]
  # Normalize the scheduled section comment line
  if ($line -match '/\* Mobile-First Scheduled Cards \*/') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $updated.Add($indent + '{/* Mobile-First Scheduled Cards */}')
    continue
  }
  # Fix inline desktop table comment
  if ($line -match '</div>/\* Desktop table \*/') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $updated.Add($indent + '</div>')
    $updated.Add($indent + '{/* Desktop table */}')
    continue
  }
  $updated.Add($line)
}
[System.IO.File]::WriteAllLines($path, $updated)
Write-Host "✅ Fixed JSX issues in scheduled section (comments only)." -ForegroundColor Green
