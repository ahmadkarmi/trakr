$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = Get-Content -LiteralPath $path

$out = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
  # Replace garbled emoji with a proper heroicon component
  if ($line -match '^\s*<span className="text-4xl">') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $out.Add($indent + '<ClipboardDocumentCheckIcon className="h-10 w-10 text-gray-400" />')
    continue
  }
  # Replace corrupted dash fallback in due cell to a JS unicode escape
  if ($line -match 'className="px-3 py-1.5 text-sm lg:text-base"' -and $line -match 'toLocaleDateString\(') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $dueLine = $indent + '<td className="px-3 py-1.5 text-sm lg:text-base">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : ''\u2014''}</td>'
    $out.Add($dueLine)
    continue
  }
  $out.Add($line)
}

[System.IO.File]::WriteAllLines($path, $out)
Write-Host "✅ Sanitized weird data in DashboardAuditor.tsx (emoji → icon, dash fallback)" -ForegroundColor Green
