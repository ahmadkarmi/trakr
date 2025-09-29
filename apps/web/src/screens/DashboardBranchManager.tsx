import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Audit, AuditStatus, Branch } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
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
      <div className="mobile-container space-y-6">
        <div className="card-mobile">
          <div className="text-center sm:text-left">
            <h2 className="heading-mobile-xl text-gray-900 mb-2">
              Welcome back, {user?.name}! 🏬
            </h2>
            <p className="text-mobile-body text-gray-600">
              Manage audits and oversee branch operations.
            </p>
          </div>
          {assignedBranches.length > 0 && (
            <div className="mt-4">
              <p className="text-mobile-caption text-gray-500 mb-3">Your assigned branches:</p>
              <div className="flex flex-wrap gap-2">
                {assignedBranches.map(branch => (
                  <span key={branch.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 touch-manipulation">
                    {branch.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mobile-grid lg:grid-cols-4">
          <StatCard title="Total Audits" value={total} subtitle="Branch total" variant="primary" icon={<ClipboardDocumentListIcon className="w-6 h-6 text-primary-700" />} />
          <StatCard title="In Progress" value={inProgress} subtitle="Currently running" variant="warning" icon={<ClockIcon className="w-6 h-6 text-warning-700" />} />
          <StatCard title="Completed" value={completed} subtitle="All time" variant="success" icon={<CheckCircleIcon className="w-6 h-6 text-success-700" />} />
          <StatCard title="Completion Rate" value={`${completionRate}%`} subtitle="Completed / Total" variant="neutral" icon={<ChartBarIcon className="w-6 h-6 text-gray-700" />} progress={completionRate} />
        </div>

        <div className="card-mobile">
          <div className="mobile-section">
            <h3 className="heading-mobile-md text-gray-900">Branch Audit Overview</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <p className="text-gray-500 py-8">Loading audits...</p>
            ) : recent.length === 0 ? (
              <p className="text-gray-500 py-8">No audits found for this branch.</p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="grid gap-3 md:hidden">
                  {recent.map((a) => {
                    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                    return (
                      <div key={a.id} className="card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900">{a.id}</div>
                            <div className="text-xs text-gray-500">{branchName} • Updated {new Date(a.updatedAt).toLocaleDateString()}</div>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="mt-3 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2 sm:justify-end">
                          <button className="btn-mobile-primary sm:btn-outline sm:btn-sm w-full sm:w-auto" onClick={() => navigate(`/audit/${a.id}`)}>
                            View Details
                          </button>
                          <button className="btn-mobile-primary sm:btn-primary sm:btn-sm w-full sm:w-auto" onClick={() => navigate(`/audit/${a.id}/summary`)}>
                            View Summary
                          </button>
                          <button
                            className="btn-mobile-primary sm:btn-secondary sm:btn-sm w-full sm:w-auto disabled:opacity-60"
                            onClick={() => { setApproveAuditId(a.id); setApproveNote(''); setApproveOpen(true) }}
                            disabled={a.status !== AuditStatus.SUBMITTED}
                            title={a.status !== AuditStatus.SUBMITTED ? 'Approval available after submission' : 'Approve with signature'}
                          >
                            {a.status === AuditStatus.APPROVED ? '✅ Approved' : '✓ Approve'}
                          </button>
                          <button
                            className="btn-mobile-primary sm:btn-outline sm:btn-sm w-full sm:w-auto disabled:opacity-60 bg-red-600 hover:bg-red-700 sm:bg-white sm:hover:bg-gray-50 sm:text-gray-700"
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
