import React, { useState } from 'react'

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Audit, Survey, AuditStatus, User, Branch, QuestionType, UserRole, LogEntry } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useAuthStore } from '../stores/auth'
import { useAuditStateMachine } from '../hooks/useAuditStateMachine'
import { useAuditProgress } from '../hooks/useAuditProgress'
import { AuditStatusBanner } from '../components/AuditStatusBanner'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { formatInTimeZone } from '../utils/datetime'
import { useOrgTimeZone } from '../hooks/useOrg'

import { CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import StatusBadge from '@/components/StatusBadge'
import { notificationHelpers } from '../utils/notifications'
import { useOrganization } from '../contexts/OrganizationContext'
import { logger } from '../utils/logger'
import toast from 'react-hot-toast'

/**
 * Audit Review Screen for Branch Managers
 * Allows managers to review submitted audits and approve or reject them
 */
export default function AuditReviewScreen() {
  const { auditId } = useParams<{ auditId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [rejectionNote, setRejectionNote] = useState('')
  
  // Signature approval state
  const [approveMode, setApproveMode] = useState<'image' | 'typed' | 'drawn'>(user?.signatureUrl ? 'image' : 'typed')
  const [typedName, setTypedName] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  
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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    startDraw(e.clientX - rect.left, e.clientY - rect.top)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    drawTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const handlePointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Pointer capture may not be set in some environments
    }
    endDraw()
  }

  // Using shared Modal component (portaled to body)

  // Fetch audit data
  const { data: audit, isLoading: loadingAudit } = useQuery<Audit | null>({
    queryKey: QK.AUDIT(auditId),
    queryFn: () => (auditId ? api.getAuditById(auditId) : Promise.resolve(null)),
    enabled: !!auditId,
  })

  // Fetch survey template (pinned version used by this audit)
  const { data: survey } = useQuery<Survey | null>({
    queryKey: QK.SURVEY_VERSION(audit?.surveyId, audit?.surveyVersion as number | undefined),
    queryFn: () => (audit?.surveyId ? (api as any).getSurveyByIdAndVersion(audit!.surveyId, (audit as any).surveyVersion ?? 1) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  })

  // Org time zone for displaying dates consistently
  const orgTimeZone = useOrgTimeZone()

  // Activity logs and audit history
  const { data: auditLogs = [] } = useQuery<LogEntry[]>({
    queryKey: QK.LOGS('audit', auditId),
    queryFn: () => (auditId ? api.getActivityLogs(auditId) : Promise.resolve([])),
    enabled: !!auditId,
  })

  const keyEvents = React.useMemo(() => {
    const logsFiltered = auditLogs
      .filter(l => ['audit_submitted', 'audit_approved', 'audit_rejected'].includes(l.action))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    if (logsFiltered.length > 0) return logsFiltered
    if (!audit) return []
    const derived: LogEntry[] = []
    if (audit.submittedAt) {
      derived.push({
        id: `${audit.id}-submitted`,
        userId: audit.submittedBy || audit.assignedTo || 'Unknown',
        action: 'audit_submitted',
        details: 'Audit submitted for approval',
        entityType: 'audit',
        entityId: audit.id,
        timestamp: audit.submittedAt,
      } as any)
    }
    if (audit.rejectedAt) {
      derived.push({
        id: `${audit.id}-rejected`,
        userId: audit.rejectedBy || 'Manager',
        action: 'audit_rejected',
        details: audit.rejectionNote || 'Audit rejected',
        entityType: 'audit',
        entityId: audit.id,
        timestamp: audit.rejectedAt,
      } as any)
    }
    if (audit.approvedAt) {
      derived.push({
        id: `${audit.id}-approved`,
        userId: audit.approvedBy || 'Manager',
        action: 'audit_approved',
        details: audit.approvalNote || 'Audit approved',
        entityType: 'audit',
        entityId: audit.id,
        timestamp: audit.approvedAt,
      } as any)
    }
    return derived.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [auditLogs, audit])

  // First submitted / Resubmitted intentionally not computed (timeline shows submission history)

  // Fetch users to get submitter name
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  
  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => api.getBranches(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  
  const branch = branches.find(b => b.id === audit?.branchId)

  const submittedByUser = users.find(u => u.id === audit?.submittedBy)
  const submittedByName = submittedByUser?.name || audit?.submittedBy || 'N/A'

  // Get audit permissions and progress
  const progress = useAuditProgress(audit || null, survey || null)
  const permissions = useAuditStateMachine(
    audit?.status || AuditStatus.SUBMITTED,
    user?.role || 'BRANCH_MANAGER' as any,
    progress.completionPercent
  )

  // Branch manager assignment check: Only assigned managers (or admins) can approve/reject
  const { data: bmAssignments = [] } = useQuery<any[]>({
    queryKey: ['branch-manager-assignments', audit?.branchId],
    queryFn: () => api.getBranchManagerAssignments(audit!.branchId),
    enabled: !!audit?.branchId,
  })
  const isAssignedManager = !!user && bmAssignments.some((a: any) => a.managerId === user.id)
  const isAdminRole = !!user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)
  const canReviewAudit = isAssignedManager || isAdminRole

  // Approve audit mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!audit || !user) return null
      const payload = {
        auditId: audit.id,
        note: approvalNote,
        signatureUrl: approveMode === 'image' ? (user.signatureUrl || undefined) : (approveMode === 'drawn' ? signatureDataUrl || undefined : undefined),
        signatureType: approveMode,
        approvalName: approveMode === 'typed' ? typedName.trim() : undefined,
      }
      return api.setAuditApproval(audit.id, { 
        status: 'approved', 
        note: payload.note, 
        userId: user.id, 
        signatureUrl: payload.signatureUrl, 
        signatureType: payload.signatureType, 
        approvalName: payload.approvalName 
      })
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
      setShowApprovalDialog(false)
      setSignatureDataUrl(null)
      setTypedName('')
      
      if (audit && user) {
        // Complete the actionable notification for this audit
        try {
          await api.completeNotificationAction(audit.id, 'REVIEW_AUDIT')
          logger.debug('Notification action completed (approved)', { context: 'AuditReviewScreen' })
          // Invalidate notification queries to update UI
          queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) })
          queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user.id) })
        } catch (error) {
          logger.error('Failed to complete notification action', error, { context: 'AuditReviewScreen' })
        }
        
        // Notify auditor about approval (best-effort)
        try {
          await notificationHelpers.notifyAuditApproved({
            auditorId: audit.assignedTo,
            auditId: audit.id,
            branchName: branch?.name || 'Unknown Branch',
            approverName: user.name || user.email,
          })
        } catch (err) {
          logger.warn('Non-blocking: failed to create approval notification (likely RLS)', { context: 'AuditReviewScreen', data: err })
        }
      }
      
      navigate(isAdminRole ? '/dashboard/admin' : '/dashboard/branch-manager')
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve audit: ${error.message}`)
    },
  })

  // Reject audit mutation
  const rejectMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!audit || !user) return null
      return api.setAuditApproval(audit.id, { status: 'rejected', note, userId: user.id })
    },
    onSuccess: async (_, note) => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
      setShowRejectionDialog(false)
      const rejectReason = note
      setRejectionNote('')
      
      if (audit && user) {
        // Complete the actionable notification for this audit
        try {
          await api.completeNotificationAction(audit.id, 'REVIEW_AUDIT')
          logger.debug('Notification action completed (rejected)', { context: 'AuditReviewScreen' })
          // Invalidate notification queries to update UI
          queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) })
          queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user.id) })
        } catch (error) {
          logger.error('Failed to complete notification action', error, { context: 'AuditReviewScreen' })
        }
        
        // Notify auditor about rejection (best-effort)
        try {
          await notificationHelpers.notifyAuditRejected({
            auditorId: audit.assignedTo,
            auditId: audit.id,
            branchName: branch?.name || 'Unknown Branch',
            rejectorName: user.name || user.email,
            reason: rejectReason,
          })
        } catch (err) {
          logger.warn('Non-blocking: failed to create rejection notification (likely RLS)', { context: 'AuditReviewScreen', data: err })
        }
      }
      
      navigate(isAdminRole ? '/dashboard/admin' : '/dashboard/branch-manager')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject audit: ${error.message}`)
    },
  })

  if (loadingAudit) {
    return (
      <DashboardLayout title="Review Audit">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading audit...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!audit || !survey) {
    return (
      <DashboardLayout title="Review Audit">
        <div className="text-center text-red-600">Audit not found</div>
      </DashboardLayout>
    )
  }

  // Cross-org access guard: prevent non-super-admins from reviewing audits outside their org
  if (!isSuperAdmin && effectiveOrgId && (audit as any).orgId && (audit as any).orgId !== effectiveOrgId) {
    return (
      <DashboardLayout title="Review Audit">
        <div className="text-center py-12">
          <p className="text-red-600 font-medium">Access denied: this audit belongs to a different organization.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-gray-600 underline">Go back</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Review Audit">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(isAdminRole ? '/dashboard/admin' : '/dashboard/branch-manager')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Audit</h1>
              <p className="text-gray-600 mt-1">{survey.title}</p>
            </div>
            <StatusBadge status={audit.status} />
          </div>
        </div>

        {/* Audit History */}
        {keyEvents.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 mt-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">📋 Audit History</h3>
              <p className="text-sm text-gray-600 mt-1">Timeline of key events for this audit</p>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {keyEvents.map((log, idx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {idx !== keyEvents.length - 1 && (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              log.action === 'audit_submitted' ? 'bg-blue-500' :
                              log.action === 'audit_approved' ? 'bg-green-500' :
                              log.action === 'audit_rejected' ? 'bg-red-500' : 'bg-gray-400'
                            }`}>
                              {log.action === 'audit_submitted' && (
                                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {log.action === 'audit_approved' && (
                                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {log.action === 'audit_rejected' && (
                                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {log.action === 'audit_submitted' && 'Audit Submitted'}
                                {log.action === 'audit_approved' && 'Audit Approved'}
                                {log.action === 'audit_rejected' && 'Audit Rejected'}
                              </p>
                              {log.userId && (
                                <p className="mt-0.5 text-sm text-gray-500">
                                  by {users.find((u: User) => u.id === log.userId)?.name || (typeof log.userId === 'string' && (log.userId as string).startsWith('Manager') ? (log.userId as string) : 'Unknown')}
                                </p>
                              )}
                              {log.details && (
                                <p className="mt-1 text-sm text-gray-600 bg-gray-50 rounded-sm p-2">{log.details}</p>
                              )}
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time dateTime={new Date(log.timestamp).toISOString()}>
                                {formatInTimeZone(log.timestamp, orgTimeZone)}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {/* Status banner */}
        <AuditStatusBanner
          permissions={permissions}
          completionPercent={progress.completionPercent}
          className="mb-6"
        />

        {/* Audit metadata */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Audit Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Submitted By</p>
              <p className="font-medium">{submittedByName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Submitted At</p>
              <p className="font-medium">
                {audit.submittedAt ? new Date(audit.submittedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {/* First Submitted / Resubmitted intentionally not shown per requirement */}
            <div>
              <p className="text-sm text-gray-600">Completion</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${progress.completionPercent}%` }}
                  />
                </div>
                <span className="font-medium">{progress.completionPercent}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="font-medium">
                {progress.answeredQuestions} / {progress.totalQuestions} answered
              </p>
            </div>
          </div>
        </div>

        {/* Survey sections and answers (read-only view) */}
        <div className="space-y-6">
          {survey.sections.map((section) => {
            const sectionProgress = progress.sectionProgress.find(s => s.sectionId === section.id)
            const sectionComment = audit.sectionComments?.[section.id]
            const sectionPhotos = (audit.sectionPhotos || []).filter(p => p.sectionId === section.id)
            
            return (
              <div key={section.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{section.title}</h3>
                  <span className="text-sm text-gray-600">
                    {sectionProgress?.answered} / {sectionProgress?.total} answered
                  </span>
                </div>

                {section.description && (
                  <p className="text-gray-600 mb-4">{section.description}</p>
                )}
                
                {sectionComment && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Section Comment:</p>
                    <p className="text-sm text-blue-800">{sectionComment}</p>
                  </div>
                )}
                
                {sectionPhotos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Section Photos:</p>
                    <div className="flex flex-wrap gap-2">
                      {sectionPhotos.map(photo => (
                        <img key={photo.id} src={photo.url} alt={photo.filename} className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {section.questions.map((question) => {
                    const answer = audit.responses?.[question.id]
                    const naReason = audit.naReasons?.[question.id]
                    const hasAnswer = answer !== undefined && answer !== null && answer !== ''

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border ${
                          hasAnswer ? 'border-gray-200 bg-gray-50' : 'border-yellow-200 bg-yellow-50'
                        }`}
                      >
                        <p className="font-medium text-gray-900 mb-2">
                          {question.text}
                          {question.required && <span className="text-red-500 ml-1">*</span>}
                        </p>

                        {hasAnswer ? (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-1">Answer:</p>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const t = question.type
                                if (t === QuestionType.YES_NO) {
                                  if (answer === 'yes') return <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-green-100 text-green-800 font-medium">✓ Yes</span>
                                  if (answer === 'no') return <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-red-100 text-red-800 font-medium">✗ No</span>
                                  if (answer === 'na') return <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-gray-200 text-gray-800 font-medium">N/A</span>
                                  return <span className="text-gray-900 font-medium">{String(answer)}</span>
                                }
                                if (t === QuestionType.DATE) {
                                  const d = new Date(String(answer))
                                  const valid = !isNaN(d.getTime())
                                  return <span className="text-gray-900 font-medium">{valid ? d.toLocaleDateString() : '—'}</span>
                                }
                                if (t === QuestionType.CHECKBOX) {
                                  try {
                                    const arr = JSON.parse(String(answer) || '[]')
                                    if (Array.isArray(arr) && arr.length > 0) {
                                      return <span className="text-gray-900 font-medium">{arr.join(', ')}</span>
                                    }
                                    return <span className="text-gray-500">—</span>
                                  } catch {
                                    return <span className="text-gray-900 font-medium">{String(answer)}</span>
                                  }
                                }
                                // TEXT, NUMBER, MULTIPLE_CHOICE and others
                                return <span className="text-gray-900 font-medium">{String(answer)}</span>
                              })()}
                            </div>
                            {question.type === QuestionType.YES_NO && answer === 'na' && naReason && (
                              <div className="mt-2 p-2 bg-gray-100 rounded-sm text-sm text-gray-700">
                                <span className="font-medium">N/A Reason:</span> {naReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-yellow-700 text-sm italic">Not answered</p>
                        )}
                        
                        {/* Per-question photos removed; photos are captured at section-level only */}

                        {question.type && (
                          <p className="text-xs text-gray-500 mt-2">Type: {question.type}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Approval/Rejection actions (only show if status = SUBMITTED) */}
        {audit.status === AuditStatus.SUBMITTED && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Review Decision</h3>
            {canReviewAudit ? (
              <div className="flex gap-4">
                <button
                  onClick={() => setShowApprovalDialog(true)}
                  className="flex-1 btn btn-primary bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectionDialog(true)}
                  className="flex-1 btn btn-danger flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="w-5 h-5" />
                  Reject
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                Only a branch manager assigned to this branch or an admin can approve or reject this audit.
              </div>
            )}
          </div>
        )}
        
        {/* Approval Dialog */}
        <Modal open={showApprovalDialog} onClose={() => setShowApprovalDialog(false)} title="Approve Audit">
          <p className="text-gray-600">
            Are you sure you want to approve this audit? You can add an optional note and must provide your signature.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approval note (optional)</label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Optional approval note..."
              className="input"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signature method</label>
            <div className="flex flex-wrap gap-2">
              {user?.signatureUrl && (
                <button
                  type="button"
                  className={`btn btn-outline btn-sm ${approveMode === 'image' ? 'bg-gray-100 border-gray-400' : ''}`}
                  onClick={() => setApproveMode('image')}
                >
                  Use saved image
                </button>
              )}
              <button
                type="button"
                className={`btn btn-outline btn-sm ${approveMode === 'typed' ? 'bg-gray-100 border-gray-400' : ''}`}
                onClick={() => setApproveMode('typed')}
              >
                Type name
              </button>
              <button
                type="button"
                className={`btn btn-outline btn-sm ${approveMode === 'drawn' ? 'bg-gray-100 border-gray-400' : ''}`}
                onClick={() => setApproveMode('drawn')}
              >
                Draw signature
              </button>
            </div>
          </div>
          {approveMode === 'image' && (
            <div>
              {user?.signatureUrl ? (
                <div>
                  <img src={user.signatureUrl} alt="Saved signature" className="h-16 object-contain border rounded-sm p-2 bg-gray-50" />
                  <p className="text-xs text-gray-500 mt-1">Using saved signature image</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No saved signature found. Choose another method.</p>
              )}
            </div>
          )}
          {approveMode === 'typed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Jane Manager"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Your typed full name will be recorded as your signature.</p>
            </div>
          )}
          {approveMode === 'drawn' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Draw signature</label>
              <div className="border rounded-sm p-2 bg-gray-50">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  className="border rounded-sm bg-white cursor-crosshair w-full"
                  style={{ touchAction: 'none' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerLeave={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" className="btn btn-outline btn-xs" onClick={clearCanvas}>Clear</button>
                  {signatureDataUrl && <span className="text-xs text-gray-500">Signature captured</span>}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Use a mouse, finger or stylus to sign.</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 mt-2">
            <button
              onClick={() => setShowApprovalDialog(false)}
              className="btn btn-outline"
              disabled={approveMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              className="btn btn-primary"
              disabled={approveMutation.isPending || (approveMode === 'image' && !user?.signatureUrl) || (approveMode === 'typed' && typedName.trim().length === 0) || (approveMode === 'drawn' && !signatureDataUrl)}
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </Modal>

        {/* Rejection Dialog */}
        <Modal open={showRejectionDialog} onClose={() => setShowRejectionDialog(false)} title="Reject Audit">
          <p className="text-gray-600">Please provide feedback explaining why this audit is being rejected.</p>
          <textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="Explain what needs to be corrected..."
            className="input"
            rows={4}
            required
          />
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowRejectionDialog(false)}
              className="btn btn-outline"
              disabled={rejectMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const note = rejectionNote.trim()
                if (note.length < 10) {
                  toast.error('Please provide at least 10 characters of feedback for rejection')
                  return
                }
                rejectMutation.mutate(note)
              }}
              className="btn btn-danger"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
