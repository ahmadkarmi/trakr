import React, { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, Survey, QuestionType, AuditStatus, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { PhotoIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, XCircleIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/auth'
import { compressImage } from '../utils/imageCompression'
import { LazyImage } from '../components/LazyImage'
import toast from 'react-hot-toast'

const AuditWizard: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: audit, isLoading: loadingAudit } = useQuery<Audit | null>({
    queryKey: QK.AUDIT(auditId),
    queryFn: () => (auditId ? api.getAuditById(auditId) : Promise.resolve(null)),
    enabled: !!auditId,
  })

  // Redirect auditors away from submitted audits (unless rejected)
  React.useEffect(() => {
    if (audit && user?.role === UserRole.AUDITOR) {
      // If audit is submitted or approved, auditor cannot edit it
      if (audit.status === AuditStatus.SUBMITTED || audit.status === AuditStatus.APPROVED) {
        navigate(`/audits/${auditId}/summary`, { replace: true })
      }
    }
  }, [audit, user, auditId, navigate])

  const { data: survey, isLoading: loadingSurvey } = useQuery<Survey | null>({
    queryKey: QK.SURVEY(audit?.surveyId),
    queryFn: () => (audit?.surveyId ? api.getSurveyById(audit!.surveyId) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  })

  const [responses, setResponses] = useState<Record<string, string>>({})
  const [naReasons, setNaReasons] = useState<Record<string, string>>({})
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})

  const [sectionIndex, setSectionIndex] = useState(0)
  const [showUnansweredOnlyBySection, setShowUnansweredOnlyBySection] = useState<Record<string, boolean>>({})
  const [sectionDocsOpen, setSectionDocsOpen] = useState(true)
  const [submitIssues, setSubmitIssues] = useState<Array<{ sectionId: string; sectionTitle: string; questions: Array<{ id: string; text: string }> }>>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Array<{ id: number; type: 'error' | 'warning' | 'success'; text: string }>>([])
  const [offline, setOffline] = useState<boolean>(!navigator.onLine)
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false)
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean>(false)

  const currentSection = useMemo(() => survey?.sections?.[sectionIndex], [survey, sectionIndex])

  const requiredNaMissingIds = useMemo(() => {
    const sec = currentSection
    if (!sec) return [] as string[]
    const missing: string[] = []
    for (const q of sec.questions) {
      const ans = responses[q.id]
      if (q.isWeighted && q.type === QuestionType.YES_NO && ans === 'na') {
        const reason = (naReasons[q.id] || '').trim()
        if (!reason) missing.push(q.id)
      }
    }
    return missing
  }, [currentSection, responses, naReasons])

  const canAdvance = requiredNaMissingIds.length === 0

  const answeredCount = useMemo(() => {
    if (!currentSection) return 0
    return currentSection.questions.filter(q => !!responses[q.id]).length
  }, [currentSection, responses])

  // Current section unanswered count (for modal messaging)
  const currentUnansweredCount = useMemo(() => {
    const sec = currentSection
    if (!sec) return 0
    return sec.questions.filter(q => !responses[q.id]).length
  }, [currentSection, responses])

  // Overall audit progress across all sections
  const allQuestionIds = useMemo(() => {
    const secs = survey?.sections || []
    const ids: string[] = []
    for (const s of secs) {
      for (const q of s.questions) ids.push(q.id)
    }
    return ids
  }, [survey])

  const overallAnsweredCount = useMemo(() => {
    if (allQuestionIds.length === 0) return 0
    let n = 0
    for (const id of allQuestionIds) if (responses[id]) n++
    return n
  }, [responses, allQuestionIds])

  const overallTotalCount = allQuestionIds.length
  const overallPercent = overallTotalCount > 0 ? Math.round((overallAnsweredCount / overallTotalCount) * 100) : 0

  const displayQuestions = useMemo(() => {
    const qs = currentSection?.questions || []
    const showOnly = currentSection ? !!showUnansweredOnlyBySection[currentSection.id] : false
    return showOnly ? qs.filter(q => !responses[q.id]) : qs
  }, [currentSection, showUnansweredOnlyBySection, responses])

  React.useEffect(() => {
    if (!audit) return
    // Merge server state into local without overwriting local edits
    setResponses(prev => {
      const server = audit.responses || {}
      return Object.keys(prev).length > 0 ? { ...server, ...prev } : server
    })
    setSectionComments(prev => {
      const server = audit.sectionComments || {}
      return (prev && Object.keys(prev).length > 0) ? { ...server, ...prev } : server
    })
  }, [audit])

  // Offline/online detection
  React.useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Warn on page unload if there are unsaved changes
  React.useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [unsavedChanges])

  const addAlert = (type: 'error' | 'warning' | 'success', text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setAlerts(prev => [...prev, { id, type, text }])
    if (type !== 'error') {
      window.setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id))
      }, 5000)
    }
  }

  const dismissAlert = (id: number) => setAlerts(prev => prev.filter(a => a.id !== id))

  const saveProgress = useMutation<Audit | null, Error, { responses: Record<string, string>; naReasons: Record<string, string>; sectionComments?: Record<string, string>}>(
    {
      mutationFn: async (payload) => {
        if (!auditId) return null
        return api.saveAuditProgress(auditId, payload)
      },
      onSuccess: () => {
        if (auditId) {
          queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
          queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
        }
        setUnsavedChanges(false)
        addAlert('success', 'Progress saved')
      },
      onError: (err) => {
        addAlert('error', `Failed to save progress: ${err.message || 'Unknown error'}`)
      },
    })

  const setAnswer = (questionId: string, value: 'yes' | 'no' | 'na') => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
    if (value !== 'na') {
      setNaReasons(prev => {
        const clone = { ...prev }
        delete clone[questionId]
        return clone
      })
    }
    setUnsavedChanges(true)
  }

  const proceedToNext = async () => {
    if (auditId) {
      try {
        await saveProgress.mutateAsync({ responses, naReasons, sectionComments })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        addAlert('error', `Failed to save progress: ${message}`)
        return
      }
    }
    const sCount = survey?.sections?.length || 0
    if (sectionIndex + 1 < sCount) {
      setSectionIndex(sectionIndex + 1)
      return
    }
    // Finished last section: mark as completed
    // Validate all required questions answered before finishing
    const issues: Array<{ sectionId: string; sectionTitle: string; questions: Array<{ id: string; text: string }> }> = []
    for (const s of survey?.sections || []) {
      const missingQs = s.questions
        .filter(q => q.required && !responses[q.id])
        .map(q => ({ id: q.id, text: q.text || '(Untitled question)' }))
      if (missingQs.length > 0) issues.push({ sectionId: s.id, sectionTitle: s.title || 'Untitled Section', questions: missingQs })
    }
    if (issues.length > 0) {
      setSubmitIssues(issues)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    } else {
      setSubmitIssues([])
    }
    if (auditId) {
      try {
        await api.setAuditStatus(auditId, AuditStatus.COMPLETED)
        queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
        addAlert('success', 'Audit completed')
        // Navigate to summary so user can review and submit for approval
        navigate(`/audit/${auditId}/summary`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        addAlert('error', `Failed to complete audit: ${message}`)
      }
    }
  }

  const goNext = () => {
    // Warn if current section has unanswered questions via modal
    const curUnanswered = (currentSection?.questions || []).filter(q => !responses[q.id]).length
    if (curUnanswered > 0) {
      setShowConfirmModal(true)
      return
    }
    void proceedToNext()
  }

  const goPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1)
    }
  }

  const goToQuestion = (sectionId: string, questionId: string) => {
    const idx = (survey?.sections || []).findIndex(s => s.id === sectionId)
    if (idx === -1) return
    if (idx !== sectionIndex) {
      setSectionIndex(idx)
      // wait for section change to render then scroll
      setTimeout(() => {
        const el = questionRefs.current[questionId]
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedQuestionId(questionId)
        setTimeout(() => setHighlightedQuestionId(prev => (prev === questionId ? null : prev)), 1600)
      }, 100)
    } else {
      const el = questionRefs.current[questionId]
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedQuestionId(questionId)
      setTimeout(() => setHighlightedQuestionId(prev => (prev === questionId ? null : prev)), 1600)
    }
  }

  // Photos (section-level)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const onPickPhotosClick = () => fileInputRef.current?.click()
  const onFilesSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!audit || !currentSection) return
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    
    let successCount = 0
    let totalSaved = 0
    
    try {
      for (const file of Array.from(files)) {
        try {
          // Compress image before upload
          const result = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8,
            maxSizeMB: 2,
          })
          
          totalSaved += (result.originalSize - result.compressedSize)
          
          const url = URL.createObjectURL(result.file)
          await api.addSectionPhoto(audit.id, currentSection.id, {
            filename: result.file.name,
            url,
            uploadedBy: audit.assignedTo,
          })
          successCount++
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          addAlert('error', `Failed to add photo ${file.name}: ${message}`)
        }
      }
      
      // Show success message with compression stats
      if (successCount > 0) {
        const savedMB = (totalSaved / (1024 * 1024)).toFixed(1)
        if (parseFloat(savedMB) > 0.1) {
          toast.success(`${successCount} photo(s) uploaded (saved ${savedMB}MB through compression)`)
        } else {
          toast.success(`${successCount} photo(s) uploaded successfully`)
        }
      }
      
      if (auditId) {
        queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
        queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploadingPhotos(false)
    }
  }
  const removePhoto = async (photoId: string) => {
    if (!audit) return
    try {
      await api.removeSectionPhoto(audit.id, photoId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      addAlert('error', `Failed to remove photo: ${message}`)
      return
    }
    if (auditId) {
      queryClient.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
    }
  }

  return (
    <DashboardLayout title="Audit Wizard">
      <div className="mobile-container breathing-room pb-24">
        <div className="card-spacious">
          <div className="card-header">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold text-gray-900">Audit Wizard</h2>
              <p className="text-gray-600 mt-1">ID: {auditId}</p>
            </div>
          </div>
          {loadingAudit || loadingSurvey ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-mobile-body text-gray-500">Loading audit…</p>
            </div>
          ) : !audit || !survey ? (
            <div className="text-center py-8">
              <p className="text-mobile-body text-gray-500">Audit or Survey not found.</p>
            </div>
          ) : (
            <>
              {/* Compact Header with Inline Progress */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
                  <p className="text-sm text-gray-500">
                    Section {sectionIndex + 1} of {survey.sections.length} • {overallAnsweredCount}/{overallTotalCount} questions
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">{overallPercent}%</div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>
              
              {/* Thin Progress Bar */}
              <div className="h-1 rounded-full bg-gray-200 overflow-hidden mb-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPercent}>
                <div className="h-1 bg-primary-600 rounded-full transition-all duration-500" style={{ width: `${overallPercent}%` }} />
              </div>

              {/* Global alerts and connection status */}
              {offline && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div className="text-mobile-body text-amber-800">You are offline. Some actions may fail until connection is restored.</div>
                </div>
              )}
              {alerts.length > 0 && (
                <div className="mb-4 space-y-3" role="status" aria-live="polite">
                  {alerts.map(a => (
                    <div key={a.id} className={`rounded-xl border p-4 flex items-start gap-3 ${a.type === 'error' ? 'bg-danger-50 border-danger-200' : a.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                      {a.type === 'error' && <XCircleIcon className="w-6 h-6 text-danger-600 flex-shrink-0" />}
                      {a.type === 'warning' && <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />}
                      {a.type === 'success' && <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />}
                      <div className={`text-mobile-body flex-1 ${a.type === 'error' ? 'text-danger-800' : a.type === 'warning' ? 'text-amber-800' : 'text-green-800'}`}>{a.text}</div>
                      <button className="touch-target p-1 hover:bg-black/5 rounded-lg" onClick={() => dismissAlert(a.id)}>
                        <XMarkIcon className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {submitIssues.length > 0 && (
                <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 p-4">
                  <h4 className="text-sm font-semibold text-danger-700">Please complete required questions before submitting:</h4>
                  <ul className="mt-2 space-y-2">
                    {submitIssues.map((grp, i) => (
                      <li key={i}>
                        <div className="text-sm font-medium text-danger-700">
                          <button
                            className="underline hover:no-underline"
                            onClick={() => {
                              // Go to first missing question in this section
                              const firstQ = grp.questions[0]?.id
                              if (firstQ) goToQuestion(grp.sectionId, firstQ)
                            }}
                          >
                            {grp.sectionTitle}
                          </button>
                        </div>
                        <ul className="list-disc ml-5 text-sm text-danger-800">
                          {grp.questions.map((q, j) => (
                            <li key={j}>
                              <button className="underline hover:no-underline" onClick={() => goToQuestion(grp.sectionId, q.id)}>{q.text}</button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table of Contents */}
              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-2">
                  {(survey.sections || []).map((s, idx) => {
                    const requiredTotal = s.questions.filter(q => q.required).length
                    const requiredAnswered = s.questions.filter(q => q.required && responses[q.id]).length
                    const pct = requiredTotal > 0 ? Math.round((requiredAnswered / requiredTotal) * 100) : 100
                    const r = 7
                    const c = 2 * Math.PI * r
                    return (
                      <button
                        key={s.id}
                        className={`btn-outline btn-xs ${idx === sectionIndex ? 'bg-white border-gray-300' : ''}`}
                        onClick={() => setSectionIndex(idx)}
                        title={`Section ${idx + 1}: ${requiredAnswered}/${requiredTotal} required answered (${pct}%)`}
                      >
                        <span className="mr-1 inline-flex items-center" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 16 16" className="block rotate-[-90deg]">
                            <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
                            <circle
                              cx="8"
                              cy="8"
                              r={r}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className={pct === 100 ? 'text-green-600' : 'text-primary-600'}
                              style={{ strokeDasharray: c, strokeDashoffset: c - (c * pct) / 100 }}
                            />
                          </svg>
                        </span>
                        <span className="sr-only">{pct}% complete. </span>
                        {s.title || `Page ${idx + 1}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="card p-4 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{currentSection?.title}</h4>
                <p className="text-sm text-gray-600 mb-6">{currentSection?.description}</p>

                {/* Utility bar: progress + filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Answered {answeredCount}/{currentSection?.questions.length || 0}</p>
                  <button
                    className={"btn btn-outline btn-xs " + ((currentSection && showUnansweredOnlyBySection[currentSection.id]) ? 'bg-primary-50 border-primary-600' : '')}
                    onClick={() => { if (currentSection) setShowUnansweredOnlyBySection(prev => ({ ...prev, [currentSection.id]: !prev[currentSection.id] })) }}
                  >
                    {(currentSection && showUnansweredOnlyBySection[currentSection.id]) ? 'Showing Unanswered' : 'Show Unanswered Only'}
                  </button>
                </div>

                {/* All questions in this section */}
                <fieldset role="group" className="space-y-6 sm:space-y-8">
                  {displayQuestions.map((q, idx) => {
                    const answer = responses[q.id]
                    const needsReason = q.isWeighted && q.type === QuestionType.YES_NO && answer === 'na'
                    const missingReason = needsReason && !(naReasons[q.id] || '').trim()
                    return (
                      <div key={q.id} ref={el => (questionRefs.current[q.id] = el)} className={`space-y-4 pb-6 sm:pb-8 border-b border-gray-200 last:border-0 ${highlightedQuestionId === q.id ? 'ring-2 ring-primary-400 rounded-lg p-4 -m-4' : ''}`}>
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <p className="font-semibold text-base sm:text-lg text-gray-900 leading-relaxed">Q{idx + 1}. {q.text}</p>
                            {q.required && (
                              <span className="shrink-0 inline-flex items-center rounded-full border border-danger-200 bg-danger-50 text-danger-700 px-2 py-0.5 text-[11px] font-medium">Required</span>
                            )}
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Answer</label>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              {([
                                { k: 'yes', label: 'Yes', icon: CheckIcon, color: 'success' },
                                { k: 'no', label: 'No', icon: XMarkIcon, color: 'danger' },
                                { k: 'na', label: 'N/A', icon: null, color: 'gray' },
                              ] as const).map(({ k, label, icon: Icon, color }) => (
                                <button
                                  key={k}
                                  type="button"
                                  data-testid={`answer-${q.id}-${k}`}
                                  aria-pressed={answer === k}
                                  className={`btn touch-target inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${
                                    answer === k 
                                      ? (color === 'success' ? 'bg-green-50 border-green-600 text-green-700 shadow-sm' 
                                        : color === 'danger' ? 'bg-red-50 border-red-600 text-red-700 shadow-sm' 
                                        : 'bg-gray-100 border-gray-500 text-gray-700 shadow-sm')
                                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-gray-400'
                                  }`}
                                  onClick={() => setAnswer(q.id, k as 'yes' | 'no' | 'na')}
                                >
                                  {Icon && <Icon className="w-5 h-5" />}
                                  <span className="font-semibold">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          {answer === 'na' && (
                            <div className="mt-5 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                              <label className="block text-sm font-semibold text-amber-900 mb-3">
                                📝 N/A Justification{needsReason ? ' (Required)' : ' (Optional)'}
                              </label>
                              <textarea
                                className={`input rounded-xl w-full text-base min-h-[140px] sm:min-h-[90px] ${missingReason ? 'border-red-500 ring-2 ring-red-200' : 'border-amber-300'}`}
                                value={naReasons[q.id] || ''}
                                onChange={(e) => { setNaReasons(prev => ({ ...prev, [q.id]: e.target.value })); setUnsavedChanges(true) }}
                                placeholder="Explain why this question is Not Applicable"
                              />
                              {missingReason && (
                                <p className="flex items-center gap-2 text-sm text-red-600 font-medium mt-3">
                                  <ExclamationTriangleIcon className="w-5 h-5" />
                                  N/A justification is required for weighted questions.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </fieldset>

                {/* Section documentation */}
                <fieldset role="group" className="mt-4">
                  <legend className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <PhotoIcon className="w-4 h-4" />
                      Section Notes & Photos
                    </span>
                    <button className="btn-ghost btn-xs" onClick={() => setSectionDocsOpen(o => !o)}>{sectionDocsOpen ? 'Hide' : 'Show'}</button>
                  </legend>
                  {sectionDocsOpen && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-2">Attach photos and add optional comments for this section.</p>
                      <div className="flex flex-wrap gap-3 mb-2">
                        {audit.sectionPhotos?.filter(p => p.sectionId === currentSection?.id).map((p) => (
                          <div key={p.id} className="flex flex-col items-center">
                            <LazyImage 
                              src={p.url} 
                              alt={p.filename || 'Section photo'}
                              className="w-20 h-20 rounded border border-gray-200" 
                              aspectRatio="1/1"
                            />
                            <button className="btn-outline btn-xs mt-1" onClick={() => removePhoto(p.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <button className="btn-outline btn-sm disabled:opacity-60" onClick={onPickPhotosClick} disabled={uploadingPhotos}>
                          {uploadingPhotos ? 'Uploading…' : 'Add Photos'}
                        </button>
                        {uploadingPhotos && (
                          <span className="inline-flex items-center text-sm text-gray-600">
                            <span className="inline-block w-4 h-4 mr-2 rounded-full border-2 border-gray-300 border-t-primary-600 animate-spin" aria-hidden />
                            Uploading
                          </span>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFilesSelected} />
                      </div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Additional comments (optional)</label>
                      <textarea
                        className="input rounded-xl border-gray-300 text-base min-h-[140px] sm:min-h-[90px]"
                        value={sectionComments[currentSection!.id] || ''}
                        onChange={(e) => { setSectionComments(prev => ({ ...prev, [currentSection!.id]: e.target.value })); setUnsavedChanges(true) }}
                        placeholder="Add any additional comments for this section"
                      />
                    </div>
                  )}
                </fieldset>

                {/* Navigation – moved to full-width bottom bar */}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-width bottom navigation bar */}
      {audit && survey && (
        <div className="fixed bottom-0 right-0 left-0 md:left-64 lg:left-72 border-t bg-white border-gray-200 shadow-lg z-40">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <button 
                className="btn btn-outline btn-responsive-sm sm:min-w-[90px]" 
                onClick={goPrev} 
                disabled={sectionIndex === 0}
                title="Previous section"
              >
                <ChevronLeftIcon className="w-5 h-5 sm:hidden" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <button
                className="btn btn-secondary btn-responsive-sm"
                onClick={async () => {
                  if (auditId) {
                    try {
                      await saveProgress.mutateAsync({ responses, naReasons, sectionComments })
                      navigate('/dashboard/auditor')
                    } catch (err) {
                      console.error('Save error:', err)
                    }
                  }
                }}
                disabled={saveProgress.isPending}
                title="Save your progress and return to dashboard"
              >
                {saveProgress.isPending ? (
                  <span className="text-sm">...</span>
                ) : (
                  <>
                    <ArrowRightOnRectangleIcon className="w-5 h-5 sm:hidden" />
                    <span className="hidden sm:inline">💾 Save & Exit</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-3">
              {/* Mobile: Animated Counter Badge */}
              <div className="sm:hidden">
                <div className="relative inline-flex items-center" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentSection && currentSection.questions.length ? Math.round((answeredCount/(currentSection.questions.length))*100) : 0}>
                  {/* Background circle */}
                  <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary-700">{answeredCount}</div>
                      <div className="text-[10px] text-primary-600 -mt-1 leading-tight">of {currentSection?.questions.length || 0}</div>
                    </div>
                  </div>
                  {/* Progress ring overlay */}
                  <svg className="absolute inset-0 w-14 h-14 -rotate-90" aria-hidden="true">
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary-600"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - (answeredCount / (currentSection?.questions.length || 1)))}`}
                      style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                  </svg>
                </div>
              </div>
              
              {/* Desktop: Linear Progress Bar */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-sm font-medium text-gray-700">
                  Section {sectionIndex + 1}/{survey.sections.length}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-500">{answeredCount}/{currentSection?.questions.length || 0}</div>
                  <div className="w-24 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-2 bg-primary-600 transition-all duration-300" style={{ width: `${currentSection && currentSection.questions.length ? Math.round((answeredCount/(currentSection.questions.length))*100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              data-testid="finish-audit" 
              className="btn btn-primary btn-responsive-sm sm:min-w-[100px]" 
              onClick={goNext} 
              disabled={!canAdvance}
              title={sectionIndex === survey.sections.length - 1 ? 'Finish audit' : 'Next section'}
            >
              {sectionIndex === survey.sections.length - 1 ? (
                <>
                  <CheckIcon className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Finish</span>
                </>
              ) : (
                <>
                  <ChevronRightIcon className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Next</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal for unanswered in current section */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[92vw] max-w-md mx-auto p-5" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="mb-3">
              <h3 id="confirm-title" className="text-lg font-semibold">Unanswered questions</h3>
              <p className="mt-1 text-sm text-gray-600">You have {currentUnansweredCount} unanswered question{currentUnansweredCount !== 1 ? 's' : ''} in this section.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button className="btn-outline" onClick={() => { if (currentSection) setShowUnansweredOnlyBySection(prev => ({ ...prev, [currentSection.id]: true })); setShowConfirmModal(false) }}>Show Unanswered Only</button>
              <button className="btn-outline" onClick={() => setShowConfirmModal(false)}>Stay</button>
              <button className="btn-primary" onClick={() => { setShowConfirmModal(false); void proceedToNext() }}>Proceed</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default AuditWizard
