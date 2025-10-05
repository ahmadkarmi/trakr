$file = 'd:\Dev\Apps\Trakr\apps\web\src\screens\DashboardAuditor.tsx'
$content = Get-Content $file -Raw

# Complete replacement of the entire mobile cards section
$oldSection = @'
                  {/* Enhanced Mobile Audit Cards */}
                  <div className="grid gap-6 md:hidden">
                    {sorted.map(a => {
                      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                      return (
                        <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                          <div className="card-header">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base mb-1 truncate">
                                  Audit {a.id}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">{branchName}</p>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={a.status} />
                                  <span className="text-xs text-gray-500">
                                    {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : 'No due date'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="card-footer">
                            <div className="flex gap-3">
                              <button 
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                                onClick={() => navigate(`/audits/${a.id}/summary`)}
                              >
                                View Summary
                              </button>
                              <button 
                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                                onClick={() => navigate(`/audit/${a.id}/wizard`)}
                              >
                                Open Audit
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
'@

$newSection = @'
                  {/* Compact Mobile Cards */}
                  <div className="space-y-3 md:hidden">
                    {sorted.map(a => {
                      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                      return (
                        <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary-600">#{a.id.slice(-4)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-gray-900 truncate">{branchName}</h4>
                                <p className="text-xs text-gray-500">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : 'No due date'}</p>
                              </div>
                            </div>
                            <StatusBadge status={a.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-2 rounded-lg text-xs font-medium"
                              onClick={() => navigate(`/audits/${a.id}/summary`)}
                            >
                              Summary
                            </button>
                            <button 
                              className="bg-primary-600 hover:bg-primary-700 text-white px-2 py-2 rounded-lg text-xs font-medium"
                              onClick={() => navigate(`/audit/${a.id}/wizard`)}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
'@

$content = $content.Replace($oldSection, $newSection)

Set-Content -Path $file -Value $content -NoNewline
Write-Host "✅ Fixed scheduled audits cards completely!" -ForegroundColor Green
