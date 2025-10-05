$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content -Raw -Path $path

# Ensure MobileAuditCard import exists
if ($content -notmatch "MobileAuditCard") {
  $importPoint = "import InfoBadge from '@/components/InfoBadge'"
  if ($content.Contains($importPoint)) {
    $content = $content.Replace($importPoint, $importPoint + "`r`n" + "import MobileAuditCard from '@/components/MobileAuditCard'")
  } else {
    $altPoint = "import StatusBadge from '@/components/StatusBadge'"
    if ($content.Contains($altPoint)) {
      $content = $content.Replace($altPoint, $altPoint + "`r`n" + "import MobileAuditCard from '@/components/MobileAuditCard'")
    }
  }
}

# Locate scheduled mobile section between comment and desktop table
$startMarkers = @('/* Mobile-First Scheduled Cards */','/* Compact Mobile Cards */','/* Enhanced Mobile Audit Cards */')
$startIdx = -1
$marker = ''
foreach ($m in $startMarkers) {
  $i = $content.IndexOf($m)
  if ($i -ge 0) { $startIdx = $i; $marker = $m; break }
}
if ($startIdx -lt 0) { throw "Start marker not found" }

$endMarker = '/* Desktop table */'
$endIdx = $content.IndexOf($endMarker, $startIdx)
if ($endIdx -lt 0) { throw "End marker not found" }

# Align to line starts for clean replacement
$lineStart = $content.LastIndexOf("`n", $startIdx)
if ($lineStart -eq -1) { $lineStart = 0 } else { $lineStart++ }

$indentMatch = [regex]::Match($content.Substring($lineStart, [Math]::Min(200, $content.Length - $lineStart)), '^[ \t]*')
$indent = if ($indentMatch.Success) { $indentMatch.Value } else { '                  ' }

$before = $content.Substring(0, $lineStart)
$after = $content.Substring($endIdx)

# Build replacement block using concatenation (no template literals to avoid PowerShell interference)
$replacement = @'
{INDENT}{/* Mobile-First Scheduled Cards */}
{INDENT}<div className="space-y-4 md:hidden">
{INDENT}  {sorted.map(a => {
{INDENT}    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
{INDENT}    return (
{INDENT}      <MobileAuditCard
{INDENT}        audit={a}
{INDENT}        branchName={branchName}
{INDENT}        surveys={surveys}
{INDENT}        mode="scheduled"
{INDENT}        onSummary={() => navigate('/audits/' + a.id + '/summary')}
{INDENT}        onOpen={() => navigate('/audit/' + a.id + '/wizard')}
{INDENT}      />
{INDENT}    )
{INDENT}  })}
{INDENT}</div>
'@
$replacement = $replacement.Replace('{INDENT}', $indent)

$newContent = $before + $replacement + $after
[System.IO.File]::WriteAllText($path, $newContent)
Write-Host "✅ Scheduled mobile section now uses MobileAuditCard with correct navigation." -ForegroundColor Green
