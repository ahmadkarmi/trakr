import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Audit, Survey, AuditStatus, User, Branch } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useAuthStore } from '../stores/auth'
import { useAuditStateMachine } from '../hooks/useAuditStateMachine'
import { useAuditProgress } from '../hooks/useAuditProgress'
import { AuditStatusBanner } from '../components/AuditStatusBanner'
import DashboardLayout from '../components/DashboardLayout'
import { CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import StatusBadge from '@/components/StatusBadge'
import { notificationHelpers } from '../utils/notifications'

/**
 * Audit Review Screen for Branch Managers
 * Allows managers to review submitted audits and approve or reject them
 */
export default function AuditReviewScreen() {
  const { auditId } = useParams<{ auditId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
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

  // Fetch audit data
  const { data: audit, isLoading: loadingAudit } = useQuery<Audit | null>({
    queryKey: QK.AUDIT(auditId),
    queryFn: () => (auditId ? api.getAuditById(auditId) : Promise.resolve(null)),
    enabled: !!auditId,
  })

  // Fetch survey template
  const { data: survey } = useQuery<Survey | null>({
    queryKey: QK.SURVEY(audit?.surveyId),
    queryFn: () => (audit?.surveyId ? api.getSurveyById(audit.surveyId) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  })

  // Fetch users to get submitter name
  const { data: users = [] } = useQuery<User[]>({
    queryKey: QK.USERS,
    queryFn: () => api.getUsers(),
  })
  
  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(),
    queryFn: () => api.getBranches(),
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
          console.log('✅ Notification action completed (approved)')
          // Invalidate notification queries to update UI
          queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) })
          queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS('all') })
        } catch (error) {
          console.error('Failed to complete notification action:', error)
        }
        
        // Notify auditor about approval
        await notificationHelpers.notifyAuditApproved({
          auditorId: audit.assignedTo,
          auditId: audit.id,
          branchName: branch?.name || 'Unknown Branch',
          approverName: user.name || user.email,
        })
      }
      
      navigate('/dashboard/branch-manager')
    },
    onError: (error: Error) => {
      alert(`Failed to approve audit: ${error.message}`)
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
          console.log('✅ Notification action completed (rejected)')
          // Invalidate notification queries to update UI
          queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) })
          queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS('all') })
        } catch (error) {
          console.error('Failed to complete notification action:', error)
        }
        
        // Notify auditor about rejection
        await notificationHelpers.notifyAuditRejected({
          auditorId: audit.assignedTo,
          auditId: audit.id,
          branchName: branch?.name || 'Unknown Branch',
          rejectorName: user.name || user.email,
          reason: rejectReason,
        })
      }
      
      navigate('/dashboard/branch-manager')
    },
    onError: (error: Error) => {
      alert(`Failed to reject audit: ${error.message}`)
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

  return (
    <DashboardLayout title="Review Audit">
      <div className="mobile-container breathing-room">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/branch-manager')}
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
                    const questionPhotos = (audit.photos || []).filter(p => p.questionId === question.id)
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
                              {answer === 'yes' ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-green-100 text-green-800 font-medium">✓ Yes</span>
                              ) : answer === 'no' ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-red-100 text-red-800 font-medium">✗ No</span>
                              ) : answer === 'na' ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-gray-200 text-gray-800 font-medium">N/A</span>
                              ) : (
                                <span className="text-gray-900 font-medium">{answer}</span>
                              )}
                            </div>
                            {answer === 'na' && naReason && (
                              <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700">
                                <span className="font-medium">N/A Reason:</span> {naReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-yellow-700 text-sm italic">Not answered</p>
                        )}
                        
                        {questionPhotos.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-600 mb-1">Photos:</p>
                            <div className="flex flex-wrap gap-2">
                              {questionPhotos.map(photo => (
                                <img key={photo.id} src={photo.url} alt={photo.filename} className="w-16 h-16 rounded object-cover border border-gray-300" />
                              ))}
                            </div>
                          </div>
                        )}

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
          </div>
        )}

        {/* Approval Dialog */}
        {showApprovalDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Approve Audit</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to approve this audit? You can add an optional note and must provide your signature.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approval note (optional)</label>
                  <textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Optional approval note..."
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signature method</label>
                  <div className="flex flex-wrap gap-2">
                    {user?.signatureUrl && (
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded border text-sm ${approveMode === 'image' ? 'bg-gray-100 border-gray-400' : 'border-gray-300'}`}
                        onClick={() => setApproveMode('image')}
                      >
                        Use saved image
                      </button>
                    )}
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded border text-sm ${approveMode === 'typed' ? 'bg-gray-100 border-gray-400' : 'border-gray-300'}`}
                      onClick={() => setApproveMode('typed')}
                    >
                      Type name
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded border text-sm ${approveMode === 'drawn' ? 'bg-gray-100 border-gray-400' : 'border-gray-300'}`}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg"
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
                    <div className="border rounded p-2 bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={120}
                        className="border rounded bg-white cursor-crosshair w-full"
                        style={{ touchAction: 'none' }}
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
                        <button type="button" className="px-2 py-1 text-sm border border-gray-300 rounded" onClick={clearCanvas}>Clear</button>
                        {signatureDataUrl && <span className="text-xs text-gray-500">Signature captured</span>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Use a mouse, finger or stylus to sign.</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowApprovalDialog(false)}
                  className="flex-1 btn btn-secondary"
                  disabled={approveMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate()}
                  className="flex-1 btn btn-primary bg-green-600 hover:bg-green-700"
                  disabled={approveMutation.isPending || (approveMode === 'image' && !user?.signatureUrl) || (approveMode === 'typed' && typedName.trim().length === 0) || (approveMode === 'drawn' && !signatureDataUrl)}
                >
                  {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Dialog */}
        {showRejectionDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Reject Audit</h3>
              <p className="text-gray-600 mb-4">
                Please provide feedback explaining why this audit is being rejected.
              </p>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                rows={4}
                required
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectionDialog(false)}
                  className="flex-1 btn btn-secondary"
                  disabled={rejectMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!rejectionNote.trim()) {
                      alert('Please provide feedback for rejection')
                      return
                    }
                    rejectMutation.mutate(rejectionNote.trim())
                  }}
                  className="flex-1 btn btn-danger"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
