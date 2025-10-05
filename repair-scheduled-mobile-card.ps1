$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = [System.IO.File]::ReadAllLines($path)

# Find start at the line containing the scheduled mobile comment
$startMatch = $lines | Select-String -Pattern 'Mobile-First Scheduled Cards|Compact Mobile Cards|Enhanced Mobile Audit Cards' | Select-Object -First 1
if (-not $startMatch) { throw "Start comment not found" }
$startIdx = $startMatch.LineNumber - 1

# Find the desktop table comment line
$endMatch = $lines | Select-String -Pattern 'Desktop table' | Where-Object { $_.LineNumber -gt $startMatch.LineNumber } | Select-Object -First 1
if (-not $endMatch) { throw "Desktop table comment not found" }
$endIdx = $endMatch.LineNumber - 1

# Determine indentation from the start line
$indent = ([regex]::Match($lines[$startIdx], '^[ \t]*')).Value

# Build replacement block
$block = @()
$block += "$indent{/* Mobile-First Scheduled Cards */}"
$block += "$indent<div className=\"space-y-4 md:hidden\">"
$block += "$indent  {sorted.map(a => {"
$block += "$indent    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId"
$block += "$indent    return ("
$block += "$indent      <MobileAuditCard"
$block += "$indent        audit={a}"
$block += "$indent        branchName={branchName}"
$block += "$indent        surveys={surveys}"
$block += "$indent        mode=\"scheduled\""
$block += "$indent        onSummary={() => navigate(`/audits/${a.id}/summary`)}"
$block += "$indent        onOpen={() => navigate(`/audit/${a.id}/wizard`)}"
$block += "$indent      />"
$block += "$indent    )"
$block += "$indent  })}"
$block += "$indent</div>"

# Reassemble lines: keep everything up to startIdx-1, then block, then from endIdx to end
$newLines = @()
if ($startIdx -gt 0) { $newLines += $lines[0..($startIdx-1)] }
$newLines += $block
$newLines += $lines[$endIdx..($lines.Length-1)]

[System.IO.File]::WriteAllLines($path, $newLines)
Write-Host "✅ Repaired scheduled mobile section to use MobileAuditCard cleanly." -ForegroundColor Green
