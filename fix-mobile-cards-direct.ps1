$filePath = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content $filePath -Raw

# Direct string replacement - find the exact block and replace it
$content = $content -replace `
  '(\s+)\{/\* Enhanced Mobile Audit Cards \*/\}' + [Environment]::NewLine + `
  '\s+<div className="grid gap-6 md:hidden">' + [Environment]::NewLine + `
  '\s+\{sorted\.map\(a => \{' + [Environment]::NewLine + `
  '\s+const branchName = branches\.find\(b => b\.id === a\.branchId\)\?\.name \|\| a\.branchId' + [Environment]::NewLine + `
  '\s+return \(' + [Environment]::NewLine + `
  '\s+<div key=\{a\.id\} className="card-compact card-interactive bg-white border border-gray-200">', `
  '$1{/* Mobile-Optimized Cards */' + [Environment]::NewLine + `
  '$1<div className="space-y-3 md:hidden">' + [Environment]::NewLine + `
  '$1  {sorted.map(a => {' + [Environment]::NewLine + `
  '$1    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId' + [Environment]::NewLine + `
  '$1    const isOverdue = a.dueAt && new Date(a.dueAt) < new Date()' + [Environment]::NewLine + `
  '$1    const isDueToday = a.dueAt && new Date(a.dueAt).toDateString() === new Date().toDateString()' + [Environment]::NewLine + `
  '$1    return (' + [Environment]::NewLine + `
  '$1      <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">'

# Replace the card content section
$content = $content -replace `
  '<div className="card-header">' + [Environment]::NewLine + `
  '\s+<div className="flex items-start justify-between gap-4">' + [Environment]::NewLine + `
  '\s+<div className="flex-1 min-w-0">' + [Environment]::NewLine + `
  '\s+<h4 className="font-semibold text-gray-900 text-base mb-1 truncate">' + [Environment]::NewLine + `
  '\s+Audit \{a\.id\}' + [Environment]::NewLine + `
  '\s+</h4>' + [Environment]::NewLine + `
  '\s+<p className="text-sm text-gray-600 mb-2">\{branchName\}</p>' + [Environment]::NewLine + `
  '\s+<div className="flex items-center gap-2">' + [Environment]::NewLine + `
  '\s+<StatusBadge status=\{a\.status\} />' + [Environment]::NewLine + `
  '\s+<span className="text-xs text-gray-500">' + [Environment]::NewLine + `
  '\s+\{a\.dueAt \? `Due \$\{new Date\(a\.dueAt\)\.toLocaleDateString\(\)\}` : ''No due date''\}' + [Environment]::NewLine + `
  '\s+</span>' + [Environment]::NewLine + `
  '\s+</div>' + [Environment]::NewLine + `
  '\s+</div>' + [Environment]::NewLine + `
  '\s+</div>' + [Environment]::NewLine + `
  '\s+</div>' + [Environment]::NewLine + `
  '\s+' + [Environment]::NewLine + `
  '\s+<div className="card-footer">' + [Environment]::NewLine + `
  '\s+<div className="flex gap-3">', `
  '<div className="flex items-center justify-between gap-2 mb-2">' + [Environment]::NewLine + `
  '          <div className="flex items-center gap-2 flex-1 min-w-0">' + [Environment]::NewLine + `
  '            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">' + [Environment]::NewLine + `
  '              <span className="text-xs font-bold text-primary-600">#{a.id.slice(-4)}</span>' + [Environment]::NewLine + `
  '            </div>' + [Environment]::NewLine + `
  '            <div className="flex-1 min-w-0">' + [Environment]::NewLine + `
  '              <h4 className="font-semibold text-sm text-gray-900 truncate">{branchName}</h4>' + [Environment]::NewLine + `
  '              <p className="text-xs text-gray-500">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : ''No due date''}</p>' + [Environment]::NewLine + `
  '            </div>' + [Environment]::NewLine + `
  '          </div>' + [Environment]::NewLine + `
  '          <StatusBadge status={a.status} />' + [Environment]::NewLine + `
  '        </div>' + [Environment]::NewLine + `
  '        <div className="grid grid-cols-2 gap-2">'

# Replace buttons section
$content = $content -replace `
  '<button ' + [Environment]::NewLine + `
  '\s+className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors touch-target"' + [Environment]::NewLine + `
  '\s+onClick=\{\(\) => navigate\(`/audits/\$\{a\.id\}/summary`\)\}' + [Environment]::NewLine + `
  '\s+>' + [Environment]::NewLine + `
  '\s+View Summary' + [Environment]::NewLine + `
  '\s+</button>' + [Environment]::NewLine + `
  '\s+<button ' + [Environment]::NewLine + `
  '\s+className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-xl font-medium transition-colors touch-target"' + [Environment]::NewLine + `
  '\s+onClick=\{\(\) => navigate\(`/audit/\$\{a\.id\}/wizard`\)\}' + [Environment]::NewLine + `
  '\s+>' + [Environment]::NewLine + `
  '\s+Open Audit' + [Environment]::NewLine + `
  '\s+</button>', `
  '<button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-2 rounded-lg text-xs font-medium transition-colors" onClick={() => navigate(`/audits/${a.id}/summary`)}>' + [Environment]::NewLine + `
  '            Summary' + [Environment]::NewLine + `
  '          </button>' + [Environment]::NewLine + `
  '          <button className="bg-primary-600 hover:bg-primary-700 text-white px-2 py-2 rounded-lg text-xs font-medium transition-colors" onClick={() => navigate(`/audit/${a.id}/wizard`)}>' + [Environment]::NewLine + `
  '            Open' + [Environment]::NewLine + `
  '          </button>'

Set-Content -Path $filePath -Value $content -NoNewline
Write-Host "✅ Updated mobile cards!" -ForegroundColor Green
