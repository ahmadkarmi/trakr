$filePath = "d:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx"
$content = Get-Content $filePath -Raw

# Replace the scheduled audits mobile cards section (lines 359-401) with the same design as recent audits
$oldPattern = @'
                  \{/\* Enhanced Mobile Audit Cards \*/\}
                  <div className="grid gap-6 md:hidden">
                    \{sorted\.map\(a => \{
                      const branchName = branches\.find\(b => b\.id === a\.branchId\)\?\.name \|\| a\.branchId
                      return \(
                        <div key=\{a\.id\} className="card-compact card-interactive bg-white border border-gray-200">
                          <div className="card-header">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base mb-1 truncate">
                                  Audit \{a\.id\}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">\{branchName\}</p>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status=\{a\.status\} />
                                  <span className="text-xs text-gray-500">
                                    \{a\.dueAt \? `Due \$\{new Date\(a\.dueAt\)\.toLocaleDateString\(\)\}` : 'No due date'\}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="card-footer">
                            <div className="flex gap-3">
                              <button 
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                                onClick=\{\(\) => navigate\(`/audits/\$\{a\.id\}/summary`\)\}
                              >
                                View Summary
                              </button>
                              <button 
                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                                onClick=\{\(\) => navigate\(`/audit/\$\{a\.id\}/wizard`\)\}
                              >
                                Open Audit
                              </button>
                            </div>
                          </div>
                        </div>
                      \)
                    \}\)\}
                  </div>
'@

$newPattern = @'
                  {/* Optimized Mobile Audit Cards */}
                  <div className="space-y-4 md:hidden">
                    {sorted.map(a => {
                      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                      const isOverdue = a.dueAt && new Date(a.dueAt) < new Date()
                      const isDueToday = a.dueAt && new Date(a.dueAt).toDateString() === new Date().toDateString()
                      
                      return (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-4 pb-3">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary-600">{a.id.slice(-2)}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-base truncate">{branchName}</h4>
                                    <p className="text-gray-600 text-sm">ID: {a.id.slice(-8)}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  <StatusBadge status={a.status} />
                                  {isOverdue && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Overdue
                                    </span>
                                  )}
                                  {isDueToday && !isOverdue && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      Due Today
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : 'No due date'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="px-4 pb-4">
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors"
                                onClick={() => navigate(`/audits/${a.id}/summary`)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Summary
                              </button>
                              <button 
                                className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
                                onClick={() => navigate(`/audit/${a.id}/wizard`)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l7 7-7 7M4 12h14" /></svg>
                                Open
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
'@

$newContent = $content -replace $oldPattern, $newPattern

Set-Content -Path $filePath -Value $newContent -NoNewline

Write-Host "✅ Fixed scheduled audits mobile cards!" -ForegroundColor Green
