$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = [System.IO.File]::ReadAllLines($path)

$out = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Length; $i++) {
  $line = $lines[$i]
  # 1) Ensure scheduled comment is correctly wrapped
  if ($line -match 'Mobile-First Scheduled Cards') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $out.Add($indent + '{/* Mobile-First Scheduled Cards */}')
    continue
  }
  # 2) Move inline desktop comment to next line and drop stray brace
  if ($line -match '</div>/\* Desktop table \*/\}') {
    $indent = ([regex]::Match($line, '^[ \t]*')).Value
    $out.Add($indent + '</div>')
    $out.Add($indent + '{/* Desktop table */}')
    continue
  }
  # 3) Normalize corrupted UTF-8 sequences with proper Unicode characters
  if ($line -match 'toLocaleDateString\(\) : ') {
    # Replace corrupted em dash sequences with proper em dash (U+2014)
    $emDash = [char]0x2014
    $enDash = [char]0x2013
    $line = $line -replace 'Ã.â.¬.',($emDash)
    $line = $line -replace 'â..',($emDash)
    $line = $line -replace 'â...',($enDash)
  }
  $out.Add($line)
}

[System.IO.File]::WriteAllLines($path, $out)
Write-Host "✅ Cleaned scheduled JSX block: fixed comment braces, moved desktop comment, and normalized em/en dashes." -ForegroundColor Green
