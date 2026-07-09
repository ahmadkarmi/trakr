import React, { useCallback, useMemo, useRef, useState } from 'react'
import { logger } from '../utils/logger'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, Survey, QuestionType, AuditStatus, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { PhotoIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, XCircleIcon, CheckCircleIcon, ChevronLeftIcon, EllipsisHorizontalIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/auth'
import { useBranches } from '../hooks/data/useBranches'
import { compressImage, validateImageFile } from '../utils/imageCompression'
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
    queryKey: QK.SURVEY_VERSION(audit?.surveyId, audit?.surveyVersion as number | undefined),
    queryFn: () => (audit?.surveyId ? (api as any).getSurveyByIdAndVersion(audit!.surveyId, (audit as any).surveyVersion ?? 1) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  })

  const [responses, setResponses] = useState<Record<string, string>>({})
  const [naReasons, setNaReasons] = useState<Record<string, string>>({})
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})

  // Branch info for header
  const { data: branches } = useBranches(audit?.orgId)
  const branchName = useMemo(() => {
    if (!audit || !branches) return ''
    const b = branches.find(b => b.id === audit.branchId)
    return b?.name || ''
  }, [audit, branches])
  const displayDate = useMemo(() => {
    const toDateSafe = (val: any): Date | null => {
      if (!val) return null
      if (val instanceof Date) return val
      const dt = new Date(val)
      return isNaN(dt.getTime()) ? null : dt
    }
    const d =
      toDateSafe((audit as any)?.periodEnd) ||
      toDateSafe((audit as any)?.dueAt) ||
      toDateSafe((audit as any)?.createdAt)
    return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''
  }, [audit])

  const [sectionIndex, setSectionIndex] = useState(0)
  const [showUnansweredOnlyBySection, setShowUnansweredOnlyBySection] = useState<Record<string, boolean>>({})
  const [sectionDocsOpen, setSectionDocsOpen] = useState(true)
  const [showSectionPicker, setShowSectionPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
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
    // N/A justification is optional; do not block progression based on missing reasons
    return [] as string[]
  }, [currentSection, responses, naReasons])

  const canAdvance = requiredNaMissingIds.length === 0

  const answeredCount = useMemo(() => {
    if (!currentSection) return 0
    let n = 0
    for (const q of currentSection.questions) {
      const raw = responses[q.id]
      if (q.type === QuestionType.YES_NO) {
        if (raw === 'yes' || raw === 'no' || raw === 'na') n++
      } else if (q.type === QuestionType.CHECKBOX) {
        try { const arr = JSON.parse(raw || '[]'); if (Array.isArray(arr) && arr.length > 0) n++ } catch {}
      } else {
        if (raw && String(raw).trim().length > 0) n++
      }
    }
    return n
  }, [currentSection, responses])

  // Current section unanswered count (for modal messaging) — uses same type-aware logic as goNext
  const currentUnansweredCount = useMemo(() => {
    const sec = currentSection
    if (!sec) return 0
    return sec.questions.filter(q => {
      const ans = responses[q.id]
      if (q.type === QuestionType.YES_NO) return !ans
      if (q.type === QuestionType.CHECKBOX) {
        try { const arr = JSON.parse(ans || '[]'); return !(Array.isArray(arr) && arr.length > 0) } catch { return !ans }
      }
      return !ans
    }).length
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

  const sectionStats = useMemo(() => {
    const stats: Record<string, { total: number; answered: number; pct: number }> = {}
    for (const s of survey?.sections || []) {
      const total = s.questions.length
      let answered = 0
      for (const q of s.questions) {
        const raw = responses[q.id]
        if (q.type === QuestionType.YES_NO) {
          if (raw === 'yes' || raw === 'no' || raw === 'na') answered++
        } else if (q.type === QuestionType.CHECKBOX) {
          try { const arr = JSON.parse(raw || '[]'); if (Array.isArray(arr) && arr.length > 0) answered++ } catch {}
        } else {
          if (raw && String(raw).trim().length > 0) answered++
        }
      }
      const pct = total > 0 ? Math.round((answered / total) * 100) : 0
      stats[s.id] = { total, answered, pct }
    }
    return stats
  }, [survey, responses])

  const displayQuestions = useMemo(() => {
    const qs = currentSection?.questions || []
    const showOnly = currentSection ? !!showUnansweredOnlyBySection[currentSection.id] : false
    return showOnly
      ? qs.filter(q => {
          const ans = responses[q.id]
          // Missing rules by type
          // For YES/NO, treat N/A as answered even without justification
          if (q.type === QuestionType.YES_NO) return !ans
          if (q.type === QuestionType.CHECKBOX) {
            try { const arr = JSON.parse(ans || '[]'); return !(Array.isArray(arr) && arr.length > 0) } catch { return !ans }
          }
          return !ans
        })
      : qs
  }, [currentSection, showUnansweredOnlyBySection, responses, naReasons])

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
    setNaReasons(prev => {
      const server = audit.naReasons || {}
      return Object.keys(prev).length > 0 ? { ...server, ...prev } : server
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

  // Keyboard shortcuts moved below goNext definition

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

  // Auto-save every 30 seconds when there are unsaved changes
  React.useEffect(() => {
    if (!auditId || !unsavedChanges || saveProgress.isPending) return
    const timer = setInterval(() => {
      saveProgress.mutate({ responses, naReasons, sectionComments })
    }, 30_000)
    return () => clearInterval(timer)
  }, [auditId, unsavedChanges, saveProgress.isPending, responses, naReasons, sectionComments])

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

  const proceedToNext = useCallback(async () => {
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
        .filter(q => {
          if (!q.required) return false
          const ans = responses[q.id]
          if (q.type === QuestionType.YES_NO) {
            // For YES/NO, only block if unanswered; N/A is allowed without justification
            return !ans
          }
          if (q.type === QuestionType.CHECKBOX) {
            try { const arr = JSON.parse(ans || '[]'); return !(Array.isArray(arr) && arr.length > 0) } catch { return true }
          }
          // TEXT, NUMBER, DATE, MULTIPLE_CHOICE -> require non-empty
          return !ans
        })
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
  }, [auditId, responses, naReasons, sectionComments, survey, sectionIndex, saveProgress, addAlert, navigate, queryClient])

  const goNext = useCallback(() => {
    // Warn if current section has unanswered questions via modal
    const curUnanswered = (currentSection?.questions || []).filter(q => {
      const ans = responses[q.id]
      // For YES/NO, treat N/A as answered even without justification
      if (q.type === QuestionType.YES_NO) return !ans
      if (q.type === QuestionType.CHECKBOX) {
        try { const arr = JSON.parse(ans || '[]'); return !(Array.isArray(arr) && arr.length > 0) } catch { return !ans }
      }
      return !ans
    }).length
    if (curUnanswered > 0) {
      setShowConfirmModal(true)
      return
    }
    void proceedToNext()
  }, [currentSection, responses, proceedToNext])

  const goPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1)
    }
  }

  React.useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (sectionIndex > 0) setSectionIndex(sectionIndex - 1)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        if (auditId) {
          try { await saveProgress.mutateAsync({ responses, naReasons, sectionComments }) } catch {}
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sectionIndex, goNext, auditId, responses, naReasons, sectionComments, saveProgress])

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
          const validation = validateImageFile(file)
          if (!validation.valid) {
            addAlert('error', `Skipped ${file.name}: ${validation.error}`)
            continue
          }
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
            uploadedBy: user?.id || audit.assignedTo,
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
      <div className="space-y-6 pb-24">
        <div className="section">
          <div className="section-header">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold text-gray-900">Audit Wizard</h2>
              <p className="text-gray-600 mt-1">
                { [branchName, displayDate].filter(Boolean).join(' • ') }
              </p>
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
              
              {/* Mobile sticky progress + section selector (full width, offset under header) */}
              <div
                className="sm:hidden sticky z-20 -mx-4 px-4 pt-2 pb-2 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-200"
                style={{ top: 'var(--app-header-height)' }}
              >
                <div className="flex">
                  <button
                    className="w-full rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2 flex items-center gap-3 active:shadow-md"
                    onClick={() => setShowSectionPicker(true)}
                    aria-label="Choose section"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{currentSection?.title || `Page ${sectionIndex + 1}`}</div>
                      <div className="text-[11px] text-gray-500">Section {sectionIndex + 1} of {survey.sections.length} • {answeredCount}/{currentSection?.questions.length || 0} answered</div>
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </div>
                <div className="h-1 rounded-full bg-gray-200 overflow-hidden mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPercent}>
                  <div className="h-1 bg-primary-600 rounded-full transition-all duration-300" style={{ width: `${overallPercent}%` }} />
                </div>
              </div>

              {/* Desktop progress bar */}
              <div className="hidden sm:block h-1 rounded-full bg-gray-200 overflow-hidden mb-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPercent}>
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

              <div className="mb-4">
                <div className="flex items-center justify-between">
                  {/* Mobile selector moved to sticky bar above */}
                  <button className="hidden" onClick={() => setShowSectionPicker(true)} />
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-gray-600">Section</span>
                    <select
                      className="input w-64"
                      value={currentSection?.id || ''}
                      onChange={(e) => {
                        const idx = (survey?.sections || []).findIndex(s => s.id === e.target.value)
                        if (idx >= 0) setSectionIndex(idx)
                      }}
                    >
                      {(survey?.sections || []).map((s, idx) => {
                        const st = sectionStats[s.id] || { answered: 0, total: s.questions.length, pct: 0 }
                        return (
                          <option key={s.id} value={s.id}>
                            {idx + 1}. {s.title} ({st.answered}/{st.total})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card p-4 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{currentSection?.title}</h4>
                <p className="text-sm text-gray-600 mb-6">{currentSection?.description}</p>

                {/* Utility bar: progress + filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Answered {answeredCount}/{currentSection?.questions.length || 0}</p>
                  <button
                    className={"btn btn-outline btn-sm " + ((currentSection && showUnansweredOnlyBySection[currentSection.id]) ? 'bg-primary-50 border-primary-600' : '')}
                    onClick={() => { if (currentSection) setShowUnansweredOnlyBySection(prev => ({ ...prev, [currentSection.id]: !prev[currentSection.id] })) }}
                  >
                    {(currentSection && showUnansweredOnlyBySection[currentSection.id]) ? 'Showing Unanswered' : 'Show Unanswered Only'}
                  </button>
                </div>

                {/* All questions in this section */}
                <fieldset role="group" className="space-y-6 sm:space-y-8">
                  {displayQuestions.map((q, idx) => {
                    const answer = responses[q.id]
                    return (
                      <div key={q.id} ref={el => { questionRefs.current[q.id] = el }} className={`space-y-4 pb-6 sm:pb-8 border-b border-gray-200 last:border-0 ${highlightedQuestionId === q.id ? 'ring-2 ring-primary-400 rounded-lg p-4 -m-4' : ''}`}>
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <p className="font-semibold text-base sm:text-lg text-gray-900 leading-relaxed">Q{idx + 1}. {q.text}</p>
                            {q.required && (
                              <span className="shrink-0 inline-flex items-center rounded-full border border-danger-200 bg-danger-50 text-danger-700 px-2 py-0.5 text-[11px] font-medium">Required</span>
                            )}
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Answer</label>
                            {/* Render by type */}
                            {q.type === QuestionType.YES_NO && (
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
                            )}

                            {q.type === QuestionType.TEXT && (
                              <textarea
                                className="input rounded-xl w-full text-base min-h-[120px]"
                                value={responses[q.id] || ''}
                                onChange={(e) => { setResponses(prev => ({ ...prev, [q.id]: e.target.value })); setUnsavedChanges(true) }}
                                placeholder="Type your answer"
                              />
                            )}

                            {q.type === QuestionType.NUMBER && (
                              <input
                                type="number"
                                className="input rounded-xl w-full text-base"
                                value={responses[q.id] || ''}
                                onChange={(e) => { setResponses(prev => ({ ...prev, [q.id]: e.target.value })); setUnsavedChanges(true) }}
                                placeholder="Enter a number"
                              />
                            )}

                            {q.type === QuestionType.DATE && (
                              <input
                                type="date"
                                className="input rounded-xl w-full text-base"
                                value={responses[q.id] || ''}
                                onChange={(e) => { setResponses(prev => ({ ...prev, [q.id]: e.target.value })); setUnsavedChanges(true) }}
                              />
                            )}

                            {q.type === QuestionType.MULTIPLE_CHOICE && (
                              <select
                                className="input rounded-xl w-full text-base"
                                value={responses[q.id] || ''}
                                onChange={(e) => { setResponses(prev => ({ ...prev, [q.id]: e.target.value })); setUnsavedChanges(true) }}
                              >
                                <option value="">Select an option</option>
                                {(q.options || []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {q.type === QuestionType.CHECKBOX && (
                              <div className="space-y-2">
                                {(q.options || []).map(opt => {
                                  let selected: string[] = []
                                  try { selected = JSON.parse(responses[q.id] || '[]') } catch { selected = [] }
                                  const isChecked = Array.isArray(selected) && selected.includes(opt)
                                  return (
                                    <label key={opt} className="inline-flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let next = Array.isArray(selected) ? [...selected] : []
                                          if (e.target.checked && !next.includes(opt)) next.push(opt)
                                          if (!e.target.checked) next = next.filter(x => x !== opt)
                                          setResponses(prev => ({ ...prev, [q.id]: JSON.stringify(next) }))
                                          setUnsavedChanges(true)
                                        }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          {q.type === QuestionType.YES_NO && answer === 'na' && (
                            <div className="mt-5 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                              <label className="block text-sm font-semibold text-amber-900 mb-3">
                                📝 N/A Justification (Optional)
                              </label>
                              <textarea
                                className={`input rounded-xl w-full text-base min-h-[140px] sm:min-h-[90px] border-amber-300`}
                                value={naReasons[q.id] || ''}
                                onChange={(e) => { setNaReasons(prev => ({ ...prev, [q.id]: e.target.value })); setUnsavedChanges(true) }}
                                placeholder="Explain why this question is Not Applicable"
                              />
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
                    <button className="btn btn-ghost btn-sm" onClick={() => setSectionDocsOpen(o => !o)}>{sectionDocsOpen ? 'Hide' : 'Show'}</button>
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
                            <button className="btn btn-outline btn-sm mt-1" onClick={() => removePhoto(p.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <button className="btn btn-outline btn-sm disabled:opacity-60" onClick={onPickPhotosClick} disabled={uploadingPhotos}>
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
                      {(() => {
                        const currentSectionId = currentSection?.id
                        return (
                          <textarea
                            className="input rounded-xl border-gray-300 text-base min-h-[140px] sm:min-h-[90px]"
                            value={currentSectionId ? (sectionComments[currentSectionId] || '') : ''}
                            onChange={(e) => {
                              if (!currentSectionId) return
                              setSectionComments(prev => ({ ...prev, [currentSectionId]: e.target.value }))
                              setUnsavedChanges(true)
                            }}
                            placeholder="Add any additional comments for this section"
                            disabled={!currentSectionId}
                          />
                        )
                      })()}
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
          <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {/* Mobile: actions only (progress moved to sticky top) */}
            <div className="flex flex-col gap-2 sm:hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button 
                    className="btn btn-outline btn-responsive-sm" 
                    onClick={goPrev} 
                    disabled={sectionIndex === 0}
                    title="Previous section"
                    aria-label="Previous section"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="btn btn-outline btn-responsive-sm"
                    aria-label="More options"
                    onClick={() => setShowMoreMenu(v => !v)}
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  </button>
                  {unsavedChanges && (
                    <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Unsaved
                    </span>
                  )}
                </div>
                <button 
                  data-testid="finish-audit" 
                  className="btn btn-primary btn-responsive-sm min-w-[88px]" 
                  onClick={goNext} 
                  disabled={!canAdvance}
                  title={sectionIndex === survey.sections.length - 1 ? 'Finish audit' : 'Next section'}
                  aria-label={sectionIndex === survey.sections.length - 1 ? 'Finish audit' : 'Next section'}
                >
                  {sectionIndex === survey.sections.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>

            {/* Desktop: single-row layout */}
            <div className="hidden sm:flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button 
                  className="btn btn-outline btn-responsive-sm sm:min-w-[90px]" 
                  onClick={goPrev} 
                  disabled={sectionIndex === 0}
                  title="Previous section"
                  aria-label="Previous section"
                >
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <button
                  className="hidden sm:inline-flex btn btn-outline btn-responsive-sm"
                  onClick={async () => {
                    if (auditId) {
                      try {
                        await saveProgress.mutateAsync({ responses, naReasons, sectionComments })
                        navigate('/dashboard/auditor')
                      } catch (err) {
                        logger.error('Save error', err, { context: 'AuditWizard' })
                      }
                    }
                  }}
                  disabled={saveProgress.isPending}
                  title="Save your progress and return to dashboard"
                  aria-label="Save and exit"
                >
                  {saveProgress.isPending ? '...' : '💾 Save & Exit'}
                </button>
                {unsavedChanges && (
                  <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    Unsaved
                  </span>
                )}
              </div>

              <div
                className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={currentSection && currentSection.questions.length ? Math.round((answeredCount/(currentSection.questions.length))*100) : 0}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-base font-bold text-primary-700">{answeredCount}</div>
                      <div className="text-[10px] text-primary-600 -mt-1 leading-tight">of {currentSection?.questions.length || 0}</div>
                    </div>
                  </div>
                  <svg className="absolute inset-0 w-14 h-14 -rotate-90" aria-hidden="true">
                    <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200" />
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
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-gray-800">Section {sectionIndex + 1} of {survey.sections.length}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[24rem]">{currentSection?.title || ''}</div>
                </div>
              </div>

              <button 
                data-testid="finish-audit" 
                className="btn btn-primary btn-responsive-sm sm:min-w-[100px]" 
                onClick={goNext} 
                disabled={!canAdvance}
                title={sectionIndex === survey.sections.length - 1 ? 'Finish audit' : 'Next section'}
                aria-label={sectionIndex === survey.sections.length - 1 ? 'Finish audit' : 'Next section'}
              >
                {sectionIndex === survey.sections.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoreMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute bottom-[64px] left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-xl">
            <div className="divide-y divide-gray-100">
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
                onClick={() => { setShowMoreMenu(false); setShowSectionPicker(true) }}
              >
                Choose Section
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
                onClick={() => {
                  if (currentSection) setShowUnansweredOnlyBySection(prev => ({ ...prev, [currentSection.id]: !prev[currentSection.id] }))
                  setShowMoreMenu(false)
                }}
              >
                {currentSection && showUnansweredOnlyBySection[currentSection.id] ? 'Hide Unanswered Filter' : 'Show Unanswered Only'}
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
                onClick={async () => {
                  setShowMoreMenu(false)
                  if (auditId) {
                    try {
                      await saveProgress.mutateAsync({ responses, naReasons, sectionComments })
                      navigate('/dashboard/auditor')
                    } catch {}
                  }
                }}
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section picker bottom sheet (mobile) */}
      {showSectionPicker && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-labelledby="section-picker-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSectionPicker(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-hidden">
            <div className="py-2">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between">
                <h3 id="section-picker-title" className="text-base font-semibold text-gray-900">Sections</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSectionPicker(false)}>Close</button>
              </div>
            </div>
            <div className="px-2 pb-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {(survey?.sections || []).map((s, idx) => {
                const st = sectionStats[s.id] || { answered: 0, total: s.questions.length, pct: 0 }
                const selected = idx === sectionIndex
                return (
                  <button
                    key={s.id}
                    className={`w-full text-left px-3 py-3 border-b border-gray-100 ${selected ? 'bg-gray-50' : ''}`}
                    onClick={() => { setSectionIndex(idx); setShowSectionPicker(false) }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{idx + 1}. {s.title}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{st.answered}/{st.total} answered</div>
                      </div>
                      <div className="ml-3 w-20">
                        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-2 rounded-full ${st.pct === 100 ? 'bg-green-500' : 'bg-primary-600'}`} style={{ width: `${st.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
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
