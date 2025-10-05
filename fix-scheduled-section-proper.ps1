$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content -Raw -Path $path

# Try to find the scheduled mobile block start marker
$markers = @('/* Mobile-First Scheduled Cards */','/* Compact Mobile Cards */','/* Enhanced Mobile Audit Cards */')
$startIdx = -1
$markerFound = ''
foreach ($m in $markers) {
  $i = $content.IndexOf($m)
  if ($i -ge 0) { $startIdx = $i; $markerFound = $m; break }
}
if ($startIdx -lt 0) { throw "Could not find scheduled section start marker" }

# Find the desktop table marker that follows
$endMarker = '/* Desktop table */'
$endIdx = $content.IndexOf($endMarker, $startIdx)
if ($endIdx -lt 0) { throw "Could not find scheduled section end marker" }

# Compute line start to remove any stray braces before the marker on that same line
$lineStart = $content.LastIndexOf("`n", $startIdx)
if ($lineStart -eq -1) { $lineStart = 0 } else { $lineStart = $lineStart + 1 }

# Determine indentation from the original line
$lineEnd = $content.IndexOf("`n", $lineStart)
if ($lineEnd -lt 0) { $lineEnd = $content.Length }
$lineText = $content.Substring($lineStart, $lineEnd - $lineStart)
$indentMatch = [regex]::Match($lineText, '^\s*')
$indent = if ($indentMatch.Success) { $indentMatch.Value } else { '                  ' }

# Build well-formed replacement block
$replacement = @"
$indent{/* Mobile-First Scheduled Cards */}
$indent<div className="space-y-4 md:hidden">
$indent  {sorted.map(a => {
$indent    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
$indent    return (
$indent      <MobileAuditCard
$indent        audit={a}
$indent        branchName={branchName}
$indent        surveys={surveys}
$indent        mode="scheduled"
$indent        onSummary={() => navigate(`/audits/${a.id}/summary`)}
$indent        onOpen={() => navigate(`/audit/${a.id}/wizard`)}
$indent      />
$indent    )
$indent  })}
$indent</div>
"@

# Reassemble content: keep everything before the line start, insert replacement, then keep from end marker onward
$before = $content.Substring(0, $lineStart)
$after = $content.Substring($endIdx)
$newContent = $before + $replacement + $after

[System.IO.File]::WriteAllText($path, $newContent)
Write-Host "✅ Scheduled section rewritten to use MobileAuditCard with correct JSX" -ForegroundColor Green
