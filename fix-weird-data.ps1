$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = [System.IO.File]::ReadAllLines($path)

$out = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
  # Fix corrupted emoji line in "No audits found" block
  if ($line -match '^\s*<span className="text-4xl">') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $out.Add($indent + '<span className="text-4xl">📋</span>')
    continue
  }
  # Fix corrupted em-dash in due cell for scheduled desktop table
  if ($line -match 'toLocaleDateString\(\) : ') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $out.Add($indent + '<td className="px-3 py-1.5 text-sm lg:text-base">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : ''\u2014''}</td>')
    continue
  }
  $out.Add($line)
}

[System.IO.File]::WriteAllLines($path, $out)
Write-Host "✅ Cleaned weird data (emoji + dash) in DashboardAuditor.tsx" -ForegroundColor Green
