$ErrorActionPreference = 'Stop'
$path = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$lines = [System.IO.File]::ReadAllLines($path)

# Find the start and end markers
$startIdx = ($lines | Select-String -SimpleMatch "{/* Enhanced Mobile Audit Cards */}" | Select-Object -First 1).LineNumber
$desktopIdx = ($lines | Select-String -SimpleMatch "{/* Desktop table */}" | Select-Object -First 1).LineNumber

if (-not $startIdx -or -not $desktopIdx) {
  Write-Error "Markers not found. start=$startIdx desktop=$desktopIdx"
}

# Convert to 0-based
$start = $startIdx - 1
$end = $desktopIdx - 2 # replace up to the line before the desktop comment

# Build replacement block with correct indentation (18 spaces as in file)
$indent = '                  '
$block = @()
$block += "$indent{/* Compact Mobile Cards */}"
$block += "$indent<div className=\"grid gap-3 md:hidden\">"
$block += "$indent  {sorted.map(a => {"
$block += "$indent    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId"
$block += "$indent    return ("
$block += "$indent      <div key={a.id} className=\"bg-white rounded-xl border border-gray-200 p-3 shadow-sm\">"
$block += "$indent        <div className=\"flex items-center justify-between gap-2 mb-2\">"
$block += "$indent          <div className=\"flex items-center gap-2 flex-1 min-w-0\">"
$block += "$indent            <div className=\"w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0\">"
$block += "$indent              <span className=\"text-xs font-bold text-primary-600\">#{a.id.slice(-4)}</span>"
$block += "$indent            </div>"
$block += "$indent            <div className=\"flex-1 min-w-0\">"
$block += "$indent              <h4 className=\"font-semibold text-sm text-gray-900 truncate\">{branchName}</h4>"
$block += "$indent              <p className=\"text-xs text-gray-500\">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : 'No due date'}</p>"
$block += "$indent            </div>"
$block += "$indent          </div>"
$block += "$indent          <StatusBadge status={a.status} />"
$block += "$indent        </div>"
$block += "$indent        <div className=\"grid grid-cols-2 gap-2\">"
$block += "$indent          <button className=\"bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-2 rounded-lg text-xs font-medium\" onClick={() => navigate(`/audits/${a.id}/summary`)}>"
$block += "$indent            Summary"
$block += "$indent          </button>"
$block += "$indent          <button className=\"bg-primary-600 hover:bg-primary-700 text-white px-2 py-2 rounded-lg text-xs font-medium\" onClick={() => navigate(`/audit/${a.id}/wizard`)}>"
$block += "$indent            Open"
$block += "$indent          </button>"
$block += "$indent        </div>"
$block += "$indent      </div>"
$block += "$indent    )"
$block += "$indent  })}"
$block += "$indent</div>"

$newLines = @()
$newLines += $lines[0..($start-1)]
$newLines += $block
$newLines += $lines[$desktopIdx-1..($lines.Length-1)]

[System.IO.File]::WriteAllLines($path, $newLines)
Write-Host "✅ Replaced scheduled mobile card section (lines $startIdx..$($desktopIdx-1))" -ForegroundColor Green
