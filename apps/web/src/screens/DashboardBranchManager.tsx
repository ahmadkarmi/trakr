import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Audit, AuditStatus, Branch } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '@/components/StatusBadge'
import { ClipboardDocumentListIcon, ClockIcon, CheckCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline'

const DashboardBranchManager: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: allAudits = [], isLoading } = useQuery<Audit[]>({
    queryKey: QK.AUDITS('branch-manager'),
    queryFn: () => api.getAudits(),
  })
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(),
    queryFn: () => api.getBranches(),
  })

  // Get branches assigned to current manager using new assignment system
  const { data: assignedBranches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-for-manager', user?.id],
    queryFn: () => user?.id ? api.getBranchesForManager(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  })

  const managedBranchIds = React.useMemo(() => assignedBranches.map(b => b.id), [assignedBranches])
  const audits = allAudits.filter(a => managedBranchIds.includes(a.branchId))
  const total = audits.length
  const inProgress = audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length
  const completed = audits.filter(a => a.status === AuditStatus.COMPLETED).length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const recent = [...audits]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const approveMutation = useMutation({
    mutationFn: async (payload: { auditId: string; note?: string; signatureUrl?: string; signatureType?: 'image' | 'typed' | 'drawn'; approvalName?: string }) =>
      api.setAuditApproval(payload.auditId, {
        status: 'approved',
        note: payload.note,
        userId: user!.id,
        signatureUrl: payload.signatureUrl,
        signatureType: payload.signatureType,
        approvalName: payload.approvalName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (payload: { auditId: string; note?: string }) => api.setAuditApproval(payload.auditId, { status: 'rejected', note: payload.note, userId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
    },
  })

  // Approval modal state
  const [approveOpen, setApproveOpen] = React.useState(false)
  const [approveAuditId, setApproveAuditId] = React.useState<string | null>(null)
  const [approveNote, setApproveNote] = React.useState('')
  const [approveMode, setApproveMode] = React.useState<'image' | 'typed' | 'drawn'>(user?.signatureUrl ? 'image' : 'typed')
  const [typedName, setTypedName] = React.useState('')
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<string | null>(null)

  // Simple signature canvas for touch devices
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawingRef = React.useRef(false)
  const lastPosRef = React.useRef<{ x: number; y: number } | null>(null)
  const startDraw = (x: number, y: number) => {
    drawingRef.current = true
    lastPosRef.current = { x, y }
  }
  const drawTo = (x: number, y: number) => {
    if (!drawingRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx || !lastPosRef.current) return
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastPosRef.current = { x, y }
  }
  const endDraw = () => {
    drawingRef.current = false
    lastPosRef.current = null
    if (canvasRef.current) setSignatureDataUrl(canvasRef.current.toDataURL('image/png'))
  }
  const clearCanvas = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    setSignatureDataUrl(null)
  }

  return (
    <DashboardLayout title="Branch Manager Dashboard">
      <div className="mobile-container breathing-room">
        {/* Mobile-First Header Layout */}
        <div className="mb-6">
          {/* Welcome Area - Full Width on Mobile */}
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xl">🏬</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Welcome back, {user?.name}</h2>
              <p className="text-sm text-gray-500">
                {assignedBranches.length} branches • {completed} pending approvals
              </p>
            </div>
          </div>
          
          {/* Branch Selector - Below Welcome on Mobile, Inline on Desktop */}
          {assignedBranches.length > 1 && (
            <div className="sm:flex sm:items-center sm:justify-between sm:-mt-16">
              <div className="hidden sm:block sm:flex-1"></div>
              <select className="w-full sm:w-auto text-sm border border-gray-300 rounded-xl sm:rounded-lg px-4 py-3 sm:py-2 bg-white touch-target">
                <option value="">All Branches</option>
                {assignedBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Approval Queue Alert */}
        {completed > 0 && (
          <div className="card-spacious bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔔</span>
                  <h3 className="text-lg font-semibold text-orange-900">Pending Approvals</h3>
                </div>
                <p className="text-orange-700 mb-1">{completed} audits waiting for your approval</p>
                <p className="text-sm text-orange-600">Review and approve completed audits</p>
              </div>
              <button
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg touch-target"
                onClick={() => {/* Scroll to approval section */}}
              >
                Review ({completed})
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Actionable Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-compact card-interactive bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center shadow-sm">
                <ClipboardDocumentListIcon className="w-7 h-7 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-primary-600 mb-1">{total}</div>
                <div className="text-sm font-medium text-gray-700">Total Audits</div>
                <div className="text-xs text-gray-500 mt-1">All branches</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact card-interactive bg-gradient-to-br from-warning-50 to-orange-50 border-warning-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-warning-100 rounded-2xl flex items-center justify-center shadow-sm">
                <ClockIcon className="w-7 h-7 text-warning-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-warning-600 mb-1">{inProgress}</div>
                <div className="text-sm font-medium text-gray-700">In Progress</div>
                <div className="text-xs text-gray-500 mt-1">Currently active</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact card-interactive bg-gradient-to-br from-success-50 to-green-50 border-success-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-success-100 rounded-2xl flex items-center justify-center shadow-sm">
                <CheckCircleIcon className="w-7 h-7 text-success-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-success-600 mb-1">{completed}</div>
                <div className="text-sm font-medium text-gray-700">Need Approval</div>
                <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact card-interactive bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                <ChartBarIcon className="w-7 h-7 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-600 mb-1">{completionRate}%</div>
                <div className="text-sm font-medium text-gray-700">Completion Rate</div>
                <div className="text-xs text-gray-500 mt-1">Overall progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval-Focused Audit Overview */}
        <div className="card-spacious">
          <div className="card-header">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Recent Audits</h3>
                <p className="text-gray-600 mt-1">Review and approve completed audits</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 font-medium">Sort by:</span>
                <select className="input rounded-xl border-gray-300 bg-white min-w-[140px]">
                  <option value="recent">Most Recent</option>
                  <option value="pending">Pending Approval</option>
                  <option value="branch">By Branch</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <p className="text-gray-500 py-8">Loading audits...</p>
            ) : recent.length === 0 ? (
              <p className="text-gray-500 py-8">No audits found for this branch.</p>
            ) : (
              <>
                {/* Enhanced Mobile Audit Cards */}
                <div className="grid gap-6 md:hidden">
                  {recent.map((a) => {
                    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                    return (
                      <div key={a.id} className="card-compact card-interactive bg-white border border-gray-200">
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
                                  Updated {new Date(a.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="card-body">
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                              onClick={() => navigate(`/audit/${a.id}`)}
                            >
                              View Details
                            </button>
                            <button 
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                              onClick={() => navigate(`/audit/${a.id}/summary`)}
                            >
                              View Summary
                            </button>
                          </div>
                        </div>
                        
                        <div className="card-footer">
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              className={`px-4 py-3 rounded-xl font-medium transition-colors touch-target ${
                                a.status === AuditStatus.SUBMITTED 
                                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              onClick={() => { setApproveAuditId(a.id); setApproveNote(''); setApproveOpen(true) }}
                              disabled={a.status !== AuditStatus.SUBMITTED}
                              title={a.status !== AuditStatus.SUBMITTED ? 'Approval available after submission' : 'Approve with signature'}
                            >
                              {a.status === AuditStatus.APPROVED ? '✅ Approved' : '✓ Approve'}
                            </button>
                            <button
                              className={`px-4 py-3 rounded-xl font-medium transition-colors touch-target ${
                                a.status !== AuditStatus.REJECTED
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              onClick={() => {
                                const note = window.prompt('Rejection reason (optional):') || ''
                                rejectMutation.mutate({ auditId: a.id, note })
                              }}
                              disabled={a.status === AuditStatus.REJECTED}
                              title={a.status === AuditStatus.REJECTED ? 'Already rejected' : 'Reject with optional reason'}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[960px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Audit</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                        <th className="px-3 py-1.5" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recent.map((a) => {
                        const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                        return (
                          <tr key={a.id}>
                            <td className="px-3 py-1.5">{a.id}</td>
                            <td className="px-3 py-1.5">{branchName}</td>
                            <td className="px-3 py-1.5"><StatusBadge status={a.status} /></td>
                            <td className="px-3 py-1.5">{new Date(a.updatedAt).toLocaleDateString()}</td>
                            <td className="px-3 py-1.5 text-right space-x-2">
                              <button className="btn-outline btn-sm md:h-10 md:px-4" onClick={() => navigate(`/audit/${a.id}`)}>Details</button>
                              <button className="btn-primary btn-sm md:h-10 md:px-4" onClick={() => navigate(`/audit/${a.id}/summary`)}>Summary</button>
                              <button
                                className="btn-secondary btn-sm md:h-10 md:px-4 disabled:opacity-60"
                                onClick={() => { setApproveAuditId(a.id); setApproveNote(''); setApproveOpen(true) }}
                                disabled={a.status !== AuditStatus.SUBMITTED}
                                title={a.status !== AuditStatus.SUBMITTED ? 'Approval available after submission' : 'Approve with signature'}
                              >
                                {a.status === AuditStatus.APPROVED ? 'Approved' : 'Approve'}
                              </button>
                              <button
                                className="btn-outline btn-sm md:h-10 md:px-4 disabled:opacity-60"
                                onClick={() => {
                                  const note = window.prompt('Rejection reason (optional):') || ''
                                  rejectMutation.mutate({ auditId: a.id, note })
                                }}
                                disabled={a.status === AuditStatus.REJECTED}
                                title={a.status === AuditStatus.REJECTED ? 'Already rejected' : 'Reject with optional reason'}
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Approval Modal */}
        {approveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setApproveOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-[92vw] max-w-lg mx-auto p-5" role="dialog" aria-modal="true" aria-labelledby="approve-title">
              <h3 id="approve-title" className="text-lg font-semibold mb-2">Approve Audit</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Approval note (optional)</label>
                  <input className="input mt-1" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
                </div>
                <div>
                  <label className="label">Signature method</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user?.signatureUrl && (
                      <button className={`btn-outline btn-xs ${approveMode === 'image' ? 'bg-gray-50' : ''}`} onClick={() => setApproveMode('image')}>Use saved image</button>
                    )}
                    <button className={`btn-outline btn-xs ${approveMode === 'typed' ? 'bg-gray-50' : ''}`} onClick={() => setApproveMode('typed')}>Type name</button>
                    <button className={`btn-outline btn-xs ${approveMode === 'drawn' ? 'bg-gray-50' : ''}`} onClick={() => setApproveMode('drawn')}>Draw signature</button>
                  </div>
                </div>
                {approveMode === 'image' && (
                  <div className="mt-1">
                    {user?.signatureUrl ? (
                      <div>
                        <img src={user.signatureUrl} alt="Saved signature" className="h-16 object-contain border rounded p-2 bg-gray-50" />
                        <p className="text-xs text-gray-500 mt-1">Using saved signature image</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No saved signature found. Choose another method.</p>
                    )}
                  </div>
                )}
                {approveMode === 'typed' && (
                  <div>
                    <label className="label">Full name</label>
                    <input className="input mt-1" placeholder="e.g., Jane Manager" value={typedName} onChange={(e) => setTypedName(e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">Your typed full name will be recorded as your signature.</p>
                  </div>
                )}
                {approveMode === 'drawn' && (
                  <div>
                    <label className="label">Draw signature</label>
                    <div className="mt-1 border rounded p-2 bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={160}
                        className="w-full h-40 bg-white rounded border"
                        onPointerDown={(e) => {
                          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                          startDraw(e.clientX - rect.left, e.clientY - rect.top)
                        }}
                        onPointerMove={(e) => {
                          if (!drawingRef.current) return
                          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                          drawTo(e.clientX - rect.left, e.clientY - rect.top)
                        }}
                        onPointerUp={endDraw}
                        onPointerLeave={endDraw}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button className="btn-outline btn-xs" onClick={clearCanvas}>Clear</button>
                        {signatureDataUrl && <span className="text-xs text-gray-500">Signature captured</span>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Use a mouse, finger or stylus to sign.</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => setApproveOpen(false)}>Cancel</button>
                <button
                  className="btn-primary"
                  disabled={approveMutation.isPending || !approveAuditId || (approveMode === 'image' && !user?.signatureUrl) || (approveMode === 'typed' && typedName.trim().length === 0) || (approveMode === 'drawn' && !signatureDataUrl)}
                  onClick={() => {
                    if (!approveAuditId) return
                    const payload = {
                      auditId: approveAuditId,
                      note: approveNote,
                      signatureUrl: approveMode === 'image' ? (user?.signatureUrl || undefined) : (approveMode === 'drawn' ? signatureDataUrl || undefined : undefined),
                      signatureType: approveMode,
                      approvalName: approveMode === 'typed' ? typedName.trim() : undefined,
                    }
                    approveMutation.mutate(payload, { onSuccess: () => { setApproveOpen(false); setSignatureDataUrl(null); setTypedName('') } })
                  }}
                >
                  {approveMutation.isPending ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DashboardBranchManager
