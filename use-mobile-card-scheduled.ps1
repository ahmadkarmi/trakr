$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content -Raw -Path $path

# Ensure import exists
if ($content -notmatch "MobileAuditCard") {
  $marker = "import InfoBadge from '@/components/InfoBadge'"
  if ($content.Contains($marker)) {
    $content = $content.Replace($marker, $marker + "`r`n" + "import MobileAuditCard from '@/components/MobileAuditCard'")
  } else {
    $marker2 = "import StatusBadge from '@/components/StatusBadge'"
    if ($content.Contains($marker2)) {
      $content = $content.Replace($marker2, $marker2 + "`r`n" + "import MobileAuditCard from '@/components/MobileAuditCard'")
    } else {
      throw "Could not find import insertion point"
    }
  }
}

$startToken = "/* Compact Mobile Cards */"
$startIdx = $content.IndexOf($startToken)
if ($startIdx -lt 0) {
  $startToken = "/* Enhanced Mobile Audit Cards */"
  $startIdx = $content.IndexOf($startToken)
}
if ($startIdx -lt 0) { throw "Start marker not found" }

$endToken = "/* Desktop table */"
$endIdx = $content.IndexOf($endToken, $startIdx)
if ($endIdx -lt 0) { throw "End marker not found" }

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

# Determine indentation
$lastNl = $before.LastIndexOf("`n")
$indent = '                  '
if ($lastNl -ge 0) {
  $lineStart = $lastNl + 1
  $tail = $before.Substring($lineStart)
  $match = [regex]::Match($tail, '^[ \t]+')
  if ($match.Success) { $indent = $match.Value }
}

# Build replacement block
$block = @()
$block += ($indent + '{/* Mobile-First Scheduled Cards */}')
$block += ($indent + '<div className="space-y-4 md:hidden">')
$block += ($indent + '  {sorted.map(a => {')
$block += ($indent + '    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId')
$block += ($indent + '    return (')
$block += ($indent + '      <MobileAuditCard')
$block += ($indent + '        audit={a}')
$block += ($indent + '        branchName={branchName}')
$block += ($indent + '        surveys={surveys}')
$block += ($indent + '        mode="scheduled"')
$block += ($indent + '        onSummary={() => navigate(`/audits/${a.id}/summary`)}')
$block += ($indent + '        onOpen={() => navigate(`/audit/${a.id}/wizard`)}')
$block += ($indent + '      />')
$block += ($indent + '    )')
$block += ($indent + '  })}')
$block += ($indent + '</div>')
$replacement = [string]::Join([Environment]::NewLine, $block)

$newContent = $before + $replacement + $after
[IO.File]::WriteAllText($path, $newContent)
Write-Host "✅ Updated scheduled section to use MobileAuditCard" -ForegroundColor Green
