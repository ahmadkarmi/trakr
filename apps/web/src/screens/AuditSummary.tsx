import React from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, Survey, calculateAuditScore, calculateWeightedAuditScore, calculateSectionWeightedCompliance, calculateSectionWeightedWeightedCompliance, AuditStatus, UserRole, Branch, LogEntry } from '@trakr/shared'
import StatusBadge from '@/components/StatusBadge'
import StatCard from '../components/StatCard'
import ProgressDonut from '../components/ProgressDonut'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/auth'
import { formatInTimeZone } from '../utils/datetime'
import { QK } from '../utils/queryKeys'
import { useOrgTimeZone } from '../hooks/useOrg'
import { api } from '../utils/api'

const AuditSummary: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()
  const { user } = useAuthStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data: audit, isLoading: loadingAudit } = useQuery<Audit | null>({
    queryKey: QK.AUDIT(auditId),
    queryFn: () => (auditId ? api.getAuditById(auditId) : Promise.resolve(null)),
    enabled: !!auditId,
  })

  // Manager approval state
  const [approveOpen, setApproveOpen] = React.useState(false)
  const [approveNote, setApproveNote] = React.useState('')
  const [approveMode, setApproveMode] = React.useState<'image' | 'typed' | 'drawn'>(user?.signatureUrl ? 'image' : 'typed')
  const [typedName, setTypedName] = React.useState('')
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<string | null>(null)
  // Reject modal state
  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [rejectNote, setRejectNote] = React.useState('')

  // Drawing canvas (for touch)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawingRef = React.useRef(false)
  const lastPosRef = React.useRef<{ x: number; y: number } | null>(null)
  const startDraw = (x: number, y: number) => { drawingRef.current = true; lastPosRef.current = { x, y } }
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
  const endDraw = () => { drawingRef.current = false; lastPosRef.current = null; if (canvasRef.current) setSignatureDataUrl(canvasRef.current.toDataURL('image/png')) }
  const clearCanvas = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; ctx.clearRect(0,0,c.width,c.height); setSignatureDataUrl(null) }

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(),
    queryFn: () => api.getBranches(),
  })

  // Organization (for time zone formatting)
  const orgTimeZone = useOrgTimeZone()

  const branch = React.useMemo(() => branches.find(b => b.id === audit?.branchId) || null, [branches, audit?.branchId])
  const canManagerApprove = React.useMemo(() => {
    if (!audit || !user) return false
    if (user.role !== UserRole.BRANCH_MANAGER) return false
    if (audit.status !== AuditStatus.SUBMITTED) return false
    if (branch && branch.managerId !== user.id) return false
    return true
  }, [audit, user, branch])

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!audit || !user) return null
      const payload = {
        auditId: audit.id,
        note: approveNote,
        signatureUrl: approveMode === 'image' ? (user.signatureUrl || undefined) : (approveMode === 'drawn' ? signatureDataUrl || undefined : undefined),
        signatureType: approveMode,
        approvalName: approveMode === 'typed' ? typedName.trim() : undefined,
      }
      return api.setAuditApproval(audit.id, { status: 'approved', note: payload.note, userId: user.id, signatureUrl: payload.signatureUrl, signatureType: payload.signatureType, approvalName: payload.approvalName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      setApproveOpen(false)
      setSignatureDataUrl(null)
      setTypedName('')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!audit || !user) return null
      return api.setAuditApproval(audit.id, { status: 'rejected', note, userId: user.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      setRejectOpen(false)
      setRejectNote('')
      showToast({ message: 'Audit rejected.', variant: 'success' })
    },
    onError: () => {
      showToast({ message: 'Failed to reject audit.', variant: 'error' })
    }
  })

  const { data: survey, isLoading: loadingSurvey } = useQuery<Survey | null>({
    queryKey: QK.SURVEY(audit?.surveyId),
    queryFn: () => (audit?.surveyId ? api.getSurveyById(audit!.surveyId) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  })

  // Recent activity for this audit (submission/approval events)
  const { data: auditLogs = [] } = useQuery<LogEntry[]>({
    queryKey: QK.LOGS('audit', auditId),
    queryFn: () => (auditId ? api.getActivityLogs(auditId) : Promise.resolve([])),
    enabled: !!auditId,
  })
  const keyEvents = React.useMemo(() => auditLogs
    .filter(l => ['audit_submitted', 'audit_approved', 'audit_rejected'].includes(l.action))
    .slice(0, 5), [auditLogs])

  const [submitIssues, setSubmitIssues] = React.useState<Array<{ sectionId: string; sectionTitle: string; questions: Array<{ id: string; text: string }> }>>([])

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!auditId || !user) return null
      if (!audit) return null
      // Only auto-complete when in draft/in_progress states. Do nothing for submitted/approved/rejected.
      if (audit.status === AuditStatus.DRAFT || audit.status === AuditStatus.IN_PROGRESS) {
        await api.setAuditStatus(auditId, AuditStatus.COMPLETED)
      } else if (audit.status === AuditStatus.SUBMITTED || audit.status === AuditStatus.APPROVED || audit.status === AuditStatus.REJECTED) {
        return null
      }
      return api.submitAuditForApproval(auditId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
    },
  })

  const handleSubmitForApproval = React.useCallback(() => {
    if (!audit || !survey || !user) return
    // Validate only when not completed yet (draft/in_progress)
    if (audit.status === AuditStatus.DRAFT || audit.status === AuditStatus.IN_PROGRESS) {
      const issues: Array<{ sectionId: string; sectionTitle: string; questions: Array<{ id: string; text: string }> }> = []
      survey.sections.forEach((sec) => {
        const missing: Array<{ id: string; text: string }> = []
        sec.questions.forEach((q) => {
          if (q.required) {
            const resp = audit.responses[q.id]
            if (!resp) missing.push({ id: q.id, text: q.text })
          }
        })
        if (missing.length > 0) issues.push({ sectionId: sec.id, sectionTitle: sec.title, questions: missing })
      })
      if (issues.length > 0) {
        setSubmitIssues(issues)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    } else if (audit.status === AuditStatus.SUBMITTED || audit.status === AuditStatus.APPROVED || audit.status === AuditStatus.REJECTED) {
      return
    }
    setSubmitIssues([])
    submitMutation.mutate()
  }, [audit, survey, user, submitMutation])

  

  return (
    <DashboardLayout title="Audit Summary">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Audit Summary - {auditId}</h2>
              {audit && (<StatusBadge status={audit.status} className="rounded-full" />)}
            </div>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" onClick={() => {
                if (!audit || !survey) return;
                // Build CSV rows
                const rows: string[] = [];
                rows.push(['Section','Question','Response','NA Reason','Weighted','Yes Wt','No Wt','Override Pts'].join(','));
                survey.sections.forEach(sec => {
                  sec.questions.forEach(q => {
                    const resp = audit.responses[q.id] || '';
                    const na = audit.naReasons[q.id] || '';
                    const weighted = q.isWeighted ? 'Yes' : 'No';
                    const y = q.yesWeight ?? '';
                    const n = q.noWeight ?? '';
                    const ov = String(audit.overrideScores?.[q.id] ?? '');
                    const cells: (string | number)[] = [sec.title, q.text, resp, na, weighted, y ?? '', n ?? '', ov];
                    // Escape and stringify
                    rows.push(cells.map((c) => ('"' + String(c).replace(/"/g,'""') + '"')).join(','));
                  });
                });
                const csv = rows.join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_${auditId}_summary.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}><DocumentArrowDownIcon className="w-4 h-4 mr-2" /> Export CSV</button>
              {(() => {
                const canExportPdf = !!audit && (!!user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || audit.status === AuditStatus.APPROVED))
                return (
                  <button
                    className={`btn-primary btn-sm ${!canExportPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => canExportPdf && window.print()}
                    title={!canExportPdf ? 'Branch Managers can export after approval' : 'Export PDF'}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Export PDF
                  </button>
                )
              })()}
              {(() => {
                const canApproveHere = canManagerApprove
                return (
                  <>
                    <button
                      className={`btn-secondary btn-sm ${!canApproveHere ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => canApproveHere && setApproveOpen(true)}
                      title={!canApproveHere ? 'Approval available for Branch Managers after submission' : 'Approve with signature'}
                      disabled={!canApproveHere}
                    >
                      Approve
                    </button>
                    <button
                    className={`btn-outline btn-sm ${!canApproveHere ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => canApproveHere && setRejectOpen(true)}
                    title={!canApproveHere ? 'Reject available after submission' : 'Reject with reason'}
                    disabled={!canApproveHere}
                  >
                    Reject
                  </button>
                  </>
                )
              })()}
              {(() => {
                const canSubmit = !!audit && !!user && user.role === UserRole.AUDITOR && (audit.status === AuditStatus.DRAFT || audit.status === AuditStatus.IN_PROGRESS || audit.status === AuditStatus.COMPLETED)
                return (
                  <button
                    className={`btn-secondary btn-sm ${!canSubmit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => canSubmit && handleSubmitForApproval()}
                    title={!canSubmit ? 'Only auditors can submit for approval. If already submitted/approved, this action is disabled.' : 'Submit for approval'}
                    disabled={!canSubmit || submitMutation.isPending}
                  >
                    {submitMutation.isPending ? 'Submitting…' : 'Submit for approval'}
                  </button>
                )
              })()}
            </div>
          {keyEvents.length > 0 && (
            <div className="mt-2 p-3 border rounded bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
              <ul className="mt-2 flex flex-wrap gap-3 text-xs text-gray-700">
                {keyEvents.map(ev => (
                  <li key={ev.id} className="inline-flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ring-1 ring-inset ${ev.action === 'audit_approved' ? 'bg-green-50 text-green-700 ring-green-600/20' : ev.action === 'audit_rejected' ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20' }`}>
                      {ev.action === 'audit_approved' ? 'Approved' : ev.action === 'audit_rejected' ? 'Rejected' : 'Submitted'}
                    </span>
                    <span>{formatInTimeZone(ev.timestamp, orgTimeZone)}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{ev.details}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Modal
            open={approveOpen}
            onClose={() => setApproveOpen(false)}
            title="Approve Audit"
            primaryAction={{
              label: approveMutation.isPending ? 'Approving…' : 'Approve',
              onClick: () => approveMutation.mutate(),
              disabled: approveMutation.isPending || !audit || (approveMode === 'image' && !user?.signatureUrl) || (approveMode === 'typed' && typedName.trim().length === 0) || (approveMode === 'drawn' && !signatureDataUrl)
            }}
            secondaryAction={{ label: 'Cancel', onClick: () => setApproveOpen(false), disabled: approveMutation.isPending }}
          >
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
          </Modal>
          <Modal
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            title="Reject Audit"
            primaryAction={{
              label: rejectMutation.isPending ? 'Rejecting…' : 'Reject',
              onClick: () => rejectMutation.mutate(rejectNote.trim()),
              disabled: rejectMutation.isPending || rejectNote.trim().length === 0
            }}
            secondaryAction={{ label: 'Cancel', onClick: () => setRejectOpen(false), disabled: rejectMutation.isPending }}
          >
            <div>
              <label className="label">Rejection reason (required)</label>
              <textarea
                className="input mt-1 h-28"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Please provide the reason for rejection"
              />
              {rejectNote.trim().length === 0 && (
                <p className="text-xs text-danger-600 mt-1">A rejection reason is required.</p>
              )}
            </div>
          </Modal>
          </div>
          {submitIssues.length > 0 && (
            <div className="mb-4 p-4 border border-danger-300 bg-danger-50 rounded">
              <h4 className="font-medium text-danger-800">Required questions remaining</h4>
              <p className="text-sm text-danger-700 mt-1">Please answer the following before submitting for approval.</p>
              <ul className="mt-2 list-disc pl-6 text-sm text-danger-800 space-y-1">
                {submitIssues.map(sec => (
                  <li key={sec.sectionId}>
                    <span className="font-medium">{sec.sectionTitle}:</span> {sec.questions.map(q => q.text).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingAudit || loadingSurvey ? (
            <p className="text-gray-500">Loading…</p>
          ) : !audit || !survey ? (
            <p className="text-gray-500">Audit or Survey not found.</p>
          ) : (
            <>
              {(() => {
                const base = calculateAuditScore(audit, survey)
                const weighted = calculateWeightedAuditScore(audit, survey)
                const completion = Math.round(base.completionPercentage)
                const compliance = Math.round(base.compliancePercentage)
                const weightedCompliance = Math.round(weighted.weightedCompliancePercentage)
                const sectionWeighted = Math.round(calculateSectionWeightedCompliance(audit, survey))
                const sectionWeightedWeighted = Math.round(calculateSectionWeightedWeightedCompliance(audit, survey))
                return (
                  <>
                    {/* KPI Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                      <StatCard title="Completion" value={`${completion}%`} subtitle={`${base.yesAnswers + base.noAnswers + base.naAnswers}/${base.totalQuestions} answered`} variant="primary" progress={completion} />
                      <StatCard title="Compliance (unweighted)" value={`${compliance}%`} subtitle="Yes / Total" variant="success" />
                      <StatCard title="Compliance (weighted)" value={`${weightedCompliance}%`} subtitle="Weighted score" variant="success" />
                      <StatCard title="N/A Selected" value={base.naAnswers} subtitle="Across all sections" variant="neutral" />
                    </div>

                    {/* Overview + Donut */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
                        <div className="text-sm text-gray-600 flex items-center gap-2">Status: <StatusBadge status={audit.status} /></div>
                        {audit.status === AuditStatus.SUBMITTED && (
                          <p className="text-sm text-amber-700 mt-1">Submitted for approval on {audit.submittedAt ? formatInTimeZone(audit.submittedAt, orgTimeZone) : ''}</p>
                        )}
                        {audit.status === AuditStatus.APPROVED && (
                          <div className="text-sm text-green-700 mt-2">
                            <p>Approved on {audit.approvedAt ? formatInTimeZone(audit.approvedAt, orgTimeZone) : ''}</p>
                            <div className="mt-2">
                              {audit.approvalSignatureType === 'typed' && audit.approvalName ? (
                                <span className="text-2xl italic text-gray-900">{audit.approvalName}</span>
                              ) : audit.approvalSignatureUrl ? (
                                <img src={audit.approvalSignatureUrl} alt="Manager signature" className="h-12 object-contain" />
                              ) : null}
                              {audit.approvalSignatureType && (
                                <div className="text-xs text-gray-500">Signature {audit.approvalSignatureType === 'typed' ? `(typed${audit.approvalName ? `: ${audit.approvalName}` : ''})` : audit.approvalSignatureType === 'drawn' ? '(drawn)' : '(image)'}</div>
                              )}
                            </div>
                            {audit.approvalNote && (
                              <p className="mt-1 text-gray-800">Approval note: <span className="font-medium">{audit.approvalNote}</span></p>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-600">Survey: {survey.title} (v{survey.version})</p>
                        <p className="text-sm text-gray-600">Updated: {formatInTimeZone(audit.updatedAt, orgTimeZone)}</p>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="p-2 rounded bg-gray-50">
                            <div className="text-gray-500">Section-weighted (unweighted)</div>
                            <div className="font-semibold text-gray-900">{sectionWeighted}%</div>
                          </div>
                          <div className="p-2 rounded bg-gray-50">
                            <div className="text-gray-500">Section-weighted (weighted)</div>
                            <div className="font-semibold text-gray-900">{sectionWeightedWeighted}%</div>
                          </div>
                        </div>
                      </div>
                      <div className="card p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Print-friendly Approval</h3>
                        <div className="text-sm text-gray-600">This block will appear in PDF printouts.</div>
                        <div className="mt-3 p-3 border rounded">
                          <div className="text-sm text-gray-700">Branch Manager Signature</div>
                          <div className="h-16 bg-gray-50 border rounded mt-2 flex items-center justify-center">
                            {audit.status === AuditStatus.APPROVED ? (
                              audit.approvalSignatureType === 'typed' && audit.approvalName ? (
                                <span className="text-2xl italic text-gray-900">{audit.approvalName}</span>
                              ) : audit.approvalSignatureUrl ? (
                                <img src={audit.approvalSignatureUrl} alt="Signature" className="h-14 object-contain" />
                              ) : (
                                <span className="text-xs text-gray-400">Approved</span>
                              )
                            ) : (
                              <span className="text-xs text-gray-400">Signature will appear here after approval</span>
                            )}
                          </div>
                          {audit.approvalName && (
                            <div className="mt-2 text-xs text-gray-500">Approved by: {audit.approvalName}</div>
                          )}
                          {audit.approvalNote && (
                            <div className="mt-2 text-xs text-gray-700">Approval note: {audit.approvalNote}</div>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-center">
                          <div className="flex flex-col items-center">
                            <ProgressDonut value={weightedCompliance} label="Weighted" />
                            <p className="mt-2 text-sm text-gray-600">Weighted compliance</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Responses by Section */}
                    <div className="card p-4 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900">Responses by Section</h3>
                      <p className="text-sm text-gray-600 mb-2">Review each question's answer and see any section comments or attachments.</p>
                      <div className="divide-y divide-gray-200">
                        {survey.sections.map((sec, sIdx) => {
                          const secPhotos = (audit.sectionPhotos || []).filter(p => p.sectionId === sec.id)
                          const secComment = audit.sectionComments?.[sec.id]
                          return (
                            <section key={sec.id} id={`summary-sec-${sec.id}`} className="py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-base font-medium text-gray-900">{sIdx + 1}. {sec.title}</h4>
                                  {secComment && (
                                    <div className="mt-1 text-sm text-gray-700">
                                      <span className="font-medium text-gray-600">Section comment:</span> {secComment}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {secPhotos.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-sm text-gray-600 mb-1">Section photos</div>
                                  <div className="flex flex-wrap gap-2">
                                    {secPhotos.map(photo => (
                                      <img key={photo.id} src={photo.url} alt={photo.filename} className="w-20 h-20 rounded object-cover border border-gray-200" />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Questions table */}
                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                      <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                      <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
                                      <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N/A Reason</th>
                                      <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photos</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {sec.questions.map((q, qIdx) => {
                                      const ans = (audit.responses || {})[q.id]
                                      const na = (audit.naReasons || {})[q.id]
                                      const qPhotos = (audit.photos || []).filter(p => p.questionId === q.id)
                                      const answerBadge = !ans ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">—</span>
                                      ) : ans === 'yes' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Yes</span>
                                      ) : ans === 'no' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">No</span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-800">N/A</span>
                                      )
                                      return (
                                        <tr key={q.id}>
                                          <td className="px-3 py-1.5 text-sm text-gray-600 whitespace-nowrap">{qIdx + 1}</td>
                                          <td className="px-3 py-1.5 text-sm text-gray-900">
                                            <div className="flex items-start gap-2">
                                              <span>{q.text}</span>
                                              {q.required && (
                                                <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Required</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-1.5 text-sm">{answerBadge}</td>
                                          <td className="px-3 py-1.5 text-sm text-gray-700">{ans === 'na' && na ? na : ''}</td>
                                          <td className="px-3 py-1.5 text-sm">
                                            {qPhotos.length > 0 ? (
                                              <div className="flex flex-wrap gap-1">
                                                {qPhotos.map(p => (
                                                  <img key={p.id} src={p.url} alt={p.filename} className="w-10 h-10 rounded object-cover border" />
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AuditSummary
