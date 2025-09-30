import React from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Survey, SurveySection, SurveyQuestion, QuestionType, QUESTION_TYPE_LABELS, AuditFrequency } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, PencilSquareIcon, XMarkIcon, InformationCircleIcon, TrophyIcon, ListBulletIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

const SurveyTemplateEditor: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>()
  const isEditing = !!surveyId
  const queryClient = useQueryClient()

  const { data: survey, isLoading } = useQuery<Survey | null>({
    queryKey: QK.SURVEY(surveyId),
    queryFn: () => (surveyId ? api.getSurveyById(surveyId) : Promise.resolve(null)),
    enabled: isEditing,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Pick<Survey, 'title' | 'description' | 'isActive' | 'sections' | 'frequency'>>) => {
      if (!surveyId) throw new Error('No surveyId provided')
      return api.updateSurvey(surveyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.SURVEYS })
      if (surveyId) queryClient.invalidateQueries({ queryKey: QK.SURVEY(surveyId) })
    },
  })

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [active, setActive] = React.useState(true)
  const [sections, setSections] = React.useState<SurveySection[]>([])
  const [frequency, setFrequency] = React.useState<AuditFrequency>(AuditFrequency.UNLIMITED)
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(null)
  const [questionModal, setQuestionModal] = React.useState<{ open: boolean; sectionId: string | null; questionId: string | null; draft: SurveyQuestion | null }>({ open: false, sectionId: null, questionId: null, draft: null })
  const questionTextRef = React.useRef<HTMLInputElement>(null)
  const modalRef = React.useRef<HTMLDivElement>(null)
  const [modalErrors, setModalErrors] = React.useState<Record<string, string>>({})
  const [pendingPoints, setPendingPoints] = React.useState<number | null>(null)
  const [pointsInputValue, setPointsInputValue] = React.useState<string>('')

  React.useEffect(() => {
    if (survey) {
      setTitle(survey.title)
      setDescription(survey.description)
      setActive(!!survey.isActive)
      setFrequency(survey.frequency || AuditFrequency.UNLIMITED)
      const nextSections = Array.isArray(survey.sections) ? survey.sections.map(s => ({ ...s })) : []
      setSections(nextSections)
      setSelectedSectionId(nextSections[0]?.id || null)
    }
  }, [survey])

  const onSave = () => {
    updateMutation.mutate({ title, description, isActive: active, sections, frequency })
  }

  // Helpers
  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const addSection = () => {
    const newSection: SurveySection = {
      id: `section-${genId()}`,
      title: 'Untitled Page',
      description: '',
      questions: [],
      order: sections.length,
    }
    setSections(prev => [...prev, newSection])
    setSelectedSectionId(newSection.id)
  }

  const updateSectionField = (sectionId: string, field: keyof Pick<SurveySection, 'title' | 'description'>, value: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, [field]: value } : s))
  }

  // Section-level weighting removed; section influence is derived from question points

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId)
      if (idx === -1) return prev
      const newArr = [...prev]
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= newArr.length) return prev
      const tmp = newArr[idx]
      newArr[idx] = newArr[swapWith]
      newArr[swapWith] = tmp
      return newArr.map((s, i) => ({ ...s, order: i }))
    })
  }

  const removeSection = (sectionId: string) => {
    setSections(prev => {
      const filtered = prev.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i }))
      // adjust selected tab
      if (!filtered.find(s => s.id === selectedSectionId || '')) {
        setSelectedSectionId(filtered[0]?.id || null)
      }
      return filtered
    })
  }

  const addQuestion = (sectionId: string) => {
    // Open modal to create a question instead of inline add
    const sec = sections.find(s => s.id === sectionId)
    const draft: SurveyQuestion = {
      id: `q-${genId()}`,
      text: '',
      type: QuestionType.YES_NO,
      required: false,
      order: sec ? sec.questions.length : 0,
      isWeighted: false,
      yesWeight: 0,
      noWeight: 0,
      options: [],
    }
    setQuestionModal({ open: true, sectionId, questionId: null, draft })
  }

  // Removed inline editing helpers in favor of modal-based editing

  const moveQuestion = (sectionId: string, questionId: string, direction: 'up' | 'down') => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const idx = s.questions.findIndex(q => q.id === questionId)
      if (idx === -1) return s
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= s.questions.length) return s
      const newQs = [...s.questions]
      const tmp = newQs[idx]
      newQs[idx] = newQs[swapWith]
      newQs[swapWith] = tmp
      return { ...s, questions: newQs.map((q, i) => ({ ...q, order: i })) }
    }))
  }

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      questions: s.questions.filter(q => q.id !== questionId).map((q, i) => ({ ...q, order: i })),
    } : s))
  }

  const openEditQuestion = (sectionId: string, questionId: string) => {
    const sec = sections.find(s => s.id === sectionId)
    const q = sec?.questions.find(x => x.id === questionId)
    if (!sec || !q) return
    // Clone to draft
    const draft: SurveyQuestion = { ...q, options: q.options ? [...q.options] : [] }
    setQuestionModal({ open: true, sectionId, questionId, draft })
  }

  const closeQuestionModal = () => setQuestionModal({ open: false, sectionId: null, questionId: null, draft: null })

  const normalizeDraftForType = (draft: SurveyQuestion): SurveyQuestion => {
    const d = { ...draft }
    if (d.type !== QuestionType.YES_NO) {
      d.isWeighted = false
      d.yesWeight = 0
      d.noWeight = 0
    } else {
      const points = Math.max(d.yesWeight ?? 0, d.noWeight ?? 0)
      const award: 'yes' | 'no' = (d.yesWeight ?? 0) > 0 ? 'yes' : ((d.noWeight ?? 0) > 0 ? 'no' : 'yes')
      d.isWeighted = points > 0
      d.yesWeight = award === 'yes' ? points : 0
      d.noWeight = award === 'no' ? points : 0
    }
    if (d.type !== QuestionType.MULTIPLE_CHOICE && d.type !== QuestionType.CHECKBOX) {
      delete d.options
    }
    if (d.type !== QuestionType.NUMBER && d.type !== QuestionType.TEXT) {
      delete d.validation
    }
    return d
  }

  // Validation helpers for the modal draft (does not close over component state; pass overridePoints explicitly)
  const validateDraft = React.useCallback((d: SurveyQuestion, overridePoints?: number): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!d.text || !d.text.trim()) {
      errors.text = 'Question text is required'
    }
    switch (d.type) {
      case QuestionType.YES_NO: {
        const points = (overridePoints ?? Math.max(d.yesWeight ?? 0, d.noWeight ?? 0))
        if (Number.isNaN(points) || points < 0) {
          errors.points = 'Points must be 0 or greater'
        }
        if (points > 0) {
          const yes = d.yesWeight ?? 0
          const no = d.noWeight ?? 0
          // If neither award selected yet but there are pending points, require award selection
          if (!((yes > 0) !== (no > 0))) {
            errors.award = 'Select Yes or No to award points'
          }
        }
        break
      }
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.CHECKBOX: {
        const opts = d.options || []
        if (opts.length < 2) errors.options = 'Provide at least two options'
        if (opts.some(o => !o.trim())) errors.options = 'Options cannot be empty'
        break
      }
      case QuestionType.NUMBER: {
        const min = d.validation?.min
        const max = d.validation?.max
        if (min != null && max != null && min > max) {
          errors.range = 'Min cannot be greater than max'
        }
        break
      }
      case QuestionType.TEXT: {
        const pat = d.validation?.pattern
        if (pat) {
          try {
            // will throw if invalid
            RegExp(pat)
          } catch {
            errors.pattern = 'Invalid regular expression'
          }
        }
        break
      }
      default:
        break
    }
    return errors
  }, [])

  const saveQuestionFromModal = React.useCallback(() => {
    if (!questionModal.open || !questionModal.sectionId || !questionModal.draft) return
    // Validate before saving
    const errs = validateDraft(questionModal.draft)
    setModalErrors(errs)
    if (Object.keys(errs).length > 0) return
    const secId = questionModal.sectionId
    const draft = normalizeDraftForType(questionModal.draft)
    setSections(prev => prev.map(s => {
      if (s.id !== secId) return s
      if (questionModal.questionId) {
        // edit existing
        return {
          ...s,
          questions: s.questions.map(q => q.id === questionModal.questionId ? { ...draft } : q)
        }
      } else {
        // add new
        return {
          ...s,
          questions: [...s.questions, { ...draft, order: s.questions.length }]
        }
      }
    }))
    closeQuestionModal()
  }, [questionModal, validateDraft])

  // Summarize question for list/table
  const getQuestionSummary = (q: SurveyQuestion): string => {
    const req = q.required ? 'Required' : 'Optional'
    switch (q.type) {
      case QuestionType.YES_NO: {
        const points = Math.max(q.yesWeight ?? 0, q.noWeight ?? 0)
        if (points <= 0) return `${req} · Unweighted`
        const award = (q.yesWeight ?? 0) > 0 ? 'Yes' : 'No'
        return `${req} · Award: ${award} · Points: ${points}`
      }
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.CHECKBOX: {
        const opts = q.options || []
        if (opts.length === 0) return `${req} · Options: —`
        const preview = opts.slice(0, 3).join(', ')
        const more = opts.length > 3 ? ` +${opts.length - 3} more` : ''
        return `${req} · Options: ${preview}${more}`
      }
      case QuestionType.NUMBER: {
        const min = q.validation?.min
        const max = q.validation?.max
        const range = (min != null || max != null) ? `${min ?? '−∞'}..${max ?? '+∞'}` : 'any'
        return `${req} · Range: ${range}`
      }
      case QuestionType.TEXT: {
        const pat = q.validation?.pattern
        return `${req}${pat ? ` · Pattern: ${pat}` : ''}`
      }
      case QuestionType.DATE:
      default:
        return `${req}`
    }
  }

  // Modal draft helpers
  const updateDraftField = <K extends keyof SurveyQuestion>(field: K, value: SurveyQuestion[K]) => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const nextDraft = { ...prev.draft, [field]: value } as SurveyQuestion
      setModalErrors(validateDraft(nextDraft))
      return { ...prev, draft: nextDraft }
    })
  }


  React.useEffect(() => {
    if (questionModal.open && questionModal.draft) {
      setModalErrors(validateDraft(questionModal.draft))
      // focus first field when opening or changing type
      questionTextRef.current?.focus()
      setPendingPoints(null)
      const maxPts = Math.max(questionModal.draft.yesWeight ?? 0, questionModal.draft.noWeight ?? 0)
      setPointsInputValue(maxPts > 0 ? String(maxPts) : '')
    }
  }, [questionModal.open, questionModal.draft, validateDraft])

  // Keyboard shortcuts: Esc to close, Enter to save when valid; trap focus within modal
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!questionModal.open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        closeQuestionModal()
      } else if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null
        if (active && active.tagName === 'TEXTAREA') return
        if (questionModal.draft) {
          const errs = validateDraft(questionModal.draft)
          if (Object.keys(errs).length === 0) {
            e.preventDefault()
            saveQuestionFromModal()
          } else {
            setModalErrors(errs)
          }
        }
      } else if (e.key === 'Tab') {
        const container = modalRef.current
        if (!container) return
        const focusables = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [questionModal.open, questionModal.draft, validateDraft, saveQuestionFromModal])

  const onDraftTypeChange = (newType: QuestionType) => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const d: SurveyQuestion = { ...prev.draft, type: newType }
      // clear type-specific fields for a clean UX
      if (newType !== QuestionType.YES_NO) {
        d.isWeighted = false; d.yesWeight = 0; d.noWeight = 0
        setPendingPoints(null)
        setPointsInputValue('')
      }
      if (newType !== QuestionType.MULTIPLE_CHOICE && newType !== QuestionType.CHECKBOX) {
        d.options = []
      }
      if (newType !== QuestionType.NUMBER && newType !== QuestionType.TEXT) {
        d.validation = undefined
      }
      setModalErrors(validateDraft(d, pendingPoints ?? undefined))
      if (newType === QuestionType.YES_NO) {
        const maxPts = Math.max(d.yesWeight ?? 0, d.noWeight ?? 0)
        setPointsInputValue(maxPts > 0 ? String(maxPts) : '')
      }
      return { ...prev, draft: d }
    })
  }

  const setDraftAward = (award: 'yes' | 'no') => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const pts = (pendingPoints ?? Math.max(prev.draft.yesWeight ?? 0, prev.draft.noWeight ?? 0))
      const draft = { ...prev.draft, yesWeight: award === 'yes' ? pts : 0, noWeight: award === 'no' ? pts : 0, isWeighted: pts > 0 }
      setModalErrors(validateDraft(draft, pendingPoints ?? undefined))
      setPendingPoints(null)
      setPointsInputValue(v => v !== '' ? v : (pts > 0 ? String(pts) : ''))
      return { ...prev, draft }
    })
  }

  const setDraftPoints = (value: string) => {
    setPointsInputValue(value)
    const p = value === '' ? 0 : Math.max(0, Number(value) || 0)
    setPendingPoints(p)
    // Re-run validation against current draft with the override points considered
    if (questionModal.draft) {
      if (questionModal.draft.type === QuestionType.YES_NO && p === 0) {
        // Deselect any previously selected award when points are zero
        setQuestionModal(prev => {
          if (!prev.draft) return prev
          const draft = { ...prev.draft, isWeighted: false, yesWeight: 0, noWeight: 0 }
          setModalErrors(validateDraft(draft, p))
          return { ...prev, draft }
        })
      } else {
        setModalErrors(validateDraft(questionModal.draft, p))
      }
    }
  }

  const setDraftValidation = (field: 'min' | 'max' | 'pattern' | 'message', value: number | string) => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const draft = { ...prev.draft, validation: { ...(prev.draft.validation || {}), [field]: value } }
      setModalErrors(validateDraft(draft, pendingPoints ?? undefined))
      return { ...prev, draft }
    })
  }

  const addDraftOption = (label: string) => {
    const value = label.trim(); if (!value) return
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const draft = { ...prev.draft, options: [ ...(prev.draft.options || []), value ] }
      setModalErrors(validateDraft(draft))
      return { ...prev, draft }
    })
  }
  const updateDraftOption = (index: number, label: string) => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const opts = [...(prev.draft.options || [])]
      opts[index] = label
      const draft = { ...prev.draft, options: opts }
      setModalErrors(validateDraft(draft))
      return { ...prev, draft }
    })
  }
  const moveDraftOption = (index: number, dir: 'up' | 'down') => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const opts = [...(prev.draft.options || [])]
      const swap = dir === 'up' ? index - 1 : index + 1
      if (swap < 0 || swap >= opts.length) return prev
      const tmp = opts[index]; opts[index] = opts[swap]; opts[swap] = tmp
      const draft = { ...prev.draft, options: opts }
      setModalErrors(validateDraft(draft))
      return { ...prev, draft }
    })
  }
  const removeDraftOption = (index: number) => {
    setQuestionModal(prev => {
      if (!prev.draft) return prev
      const draft = { ...prev.draft, options: (prev.draft.options || []).filter((_, i) => i !== index) }
      setModalErrors(validateDraft(draft))
      return { ...prev, draft }
    })
  }

  return (
    <DashboardLayout title={isEditing ? 'Edit Survey Template' : 'Create Survey Template'}>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {isLoading ? (
          <p className="text-gray-500">Loading template…</p>
        ) : !isEditing || !survey ? (
          <p className="text-gray-500">Template not found.</p>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900">Template Settings</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="label" htmlFor="title">Title</label>
                <input id="title" className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="active">Active</label>
                <div className="mt-2">
                  <button
                    className="btn btn-outline btn-md"
                    onClick={() => setActive(v => !v)}
                  >
                    {active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="frequency">Frequency</label>
                <select
                  id="frequency"
                  className="input mt-1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as AuditFrequency)}
                  title="How often this survey can be conducted per branch"
                >
                  <option value={AuditFrequency.UNLIMITED}>Unlimited</option>
                  <option value={AuditFrequency.DAILY}>Daily</option>
                  <option value={AuditFrequency.WEEKLY}>Weekly</option>
                  <option value={AuditFrequency.MONTHLY}>Monthly</option>
                  <option value={AuditFrequency.QUARTERLY}>Quarterly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="desc">Description</label>
              <textarea
                id="desc"
                className="input mt-1"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button className="btn btn-outline btn-md" onClick={() => { setTitle(survey.title); setDescription(survey.description); setActive(!!survey.isActive); setFrequency(survey.frequency || AuditFrequency.UNLIMITED); setSections(survey.sections || []); }}>Reset</button>
              <button className="btn btn-primary btn-md" onClick={onSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            <hr className="my-6" />

            {/* Pages as tabs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-wrap gap-2">
                  {[...sections].sort((a,b) => (a.order ?? 0) - (b.order ?? 0)).map(sec => (
                    <button
                      key={sec.id}
                      className={`px-3 py-1 rounded-t border ${selectedSectionId===sec.id ? 'bg-white border-gray-300 border-b-white' : 'bg-gray-100 border-transparent'} text-sm`}
                      onClick={() => setSelectedSectionId(sec.id)}
                    >
                      {sec.title || 'Untitled Page'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <button className="btn btn-ghost btn-sm" title="Add Page" onClick={addSection}>
                    <PlusIcon className="w-5 h-5" />
                  </button>
                  {selectedSectionId && (
                    <>
                      <button className="btn btn-ghost btn-sm" title="Move Left" onClick={() => moveSection(selectedSectionId, 'up')}>
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Move Right" onClick={() => moveSection(selectedSectionId, 'down')}>
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger-600" title="Remove Page" onClick={() => removeSection(selectedSectionId)}>
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Selected page editor */}
              {sections.length === 0 || !selectedSectionId ? (
                <p className="text-gray-500">No pages defined yet.</p>
              ) : (
                (() => {
                  const sec = sections.find(s => s.id === selectedSectionId)!;
                  return (
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="label">Page Title</label>
                          <input className="input mt-1" value={sec.title} onChange={(e) => updateSectionField(sec.id, 'title', e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Page Description</label>
                          <input className="input mt-1" value={sec.description || ''} onChange={(e) => updateSectionField(sec.id, 'description', e.target.value)} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-semibold text-gray-900">Questions</h4>
                        <button className="btn btn-secondary btn-sm" onClick={() => addQuestion(sec.id)}>Add Question</button>
                      </div>

                      {sec.questions.length === 0 ? (
                        <p className="text-gray-500">No questions yet.</p>
                      ) : (
                        <>
                          {/* Mobile list (summary + actions) */}
                          <ul className="sm:hidden space-y-3">
                            {sec.questions.map((q, idx) => (
                              <li key={q.id} className="card">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">Q{idx + 1}: {q.text || '(Untitled question)'}</div>
                                    <div className="text-xs text-gray-500 mt-1">Type: {QUESTION_TYPE_LABELS[q.type]}</div>
                                    <div className="text-xs text-gray-500">{getQuestionSummary(q)}</div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => openEditQuestion(sec.id, q.id)}>
                                      <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    <button className="btn btn-ghost btn-xs" title="Move Up" onClick={() => moveQuestion(sec.id, q.id, 'up')}>
                                      <ChevronUpIcon className="w-4 h-4" />
                                    </button>
                                    <button className="btn btn-ghost btn-xs" title="Move Down" onClick={() => moveQuestion(sec.id, q.id, 'down')}>
                                      <ChevronDownIcon className="w-4 h-4" />
                                    </button>
                                    <button className="btn btn-ghost btn-xs text-danger-600" title="Delete" onClick={() => removeQuestion(sec.id, q.id)}>
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>

                          {/* Desktop summary table */}
                          <div className="hidden sm:block overflow-auto">
                            <table className="min-w-full table-fixed border-collapse">
                              <thead className="bg-gray-50 text-xs text-gray-600">
                                <tr>
                                  <th className="px-2 py-1.5 w-12 text-left">#</th>
                                  <th className="px-2 py-1.5">Question</th>
                                  <th className="px-2 py-1.5 w-36">Type</th>
                                  <th className="px-2 py-1.5">Summary</th>
                                  <th className="px-2 py-1.5 w-40">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm">
                                {sec.questions.map((q, idx) => (
                                  <tr key={q.id} className="odd:bg-white even:bg-gray-50 border-t">
                                    <td className="px-2 py-1.5 align-top">{idx + 1}</td>
                                    <td className="px-2 py-1.5 align-top">{q.text || '(Untitled question)'}</td>
                                    <td className="px-2 py-1.5 align-top">{QUESTION_TYPE_LABELS[q.type]}</td>
                                    <td className="px-2 py-1.5 align-top">{getQuestionSummary(q)}</td>
                                    <td className="px-2 py-1.5 align-top">
                                      <div className="flex gap-1">
                                        <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => openEditQuestion(sec.id, q.id)}>
                                          <PencilSquareIcon className="w-4 h-4" />
                                        </button>
                                        <button className="btn btn-ghost btn-xs" title="Move Up" onClick={() => moveQuestion(sec.id, q.id, 'up')}>
                                          <ChevronUpIcon className="w-4 h-4" />
                                        </button>
                                        <button className="btn btn-ghost btn-xs" title="Move Down" onClick={() => moveQuestion(sec.id, q.id, 'down')}>
                                          <ChevronDownIcon className="w-4 h-4" />
                                        </button>
                                        <button className="btn btn-ghost btn-xs text-danger-600" title="Delete" onClick={() => removeQuestion(sec.id, q.id)}>
                                          <TrashIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()
              )}
            </div>
          </>
        )}
      </div>

      {/* Question Editor Modal */}
      {questionModal.open && questionModal.draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeQuestionModal} />
          <div ref={modalRef} className="relative bg-white rounded-xl shadow-xl w-[92vw] max-w-3xl mx-auto max-h-[85vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="question-editor-title">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 id="question-editor-title" className="text-lg font-semibold">{questionModal.questionId ? 'Edit Question' : 'Add Question'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeQuestionModal}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 overflow-y-auto">
              <fieldset role="group" className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <InformationCircleIcon className="w-4 h-4" />
                  Basic
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 border rounded-lg bg-gray-50">
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="modal-question-text">Question Text</label>
                    <input id="modal-question-text" ref={questionTextRef} aria-invalid={!!modalErrors.text} aria-describedby="help-question-text" className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={questionModal.draft!.text} onChange={(e) => updateDraftField('text', e.target.value)} />
                    <p id="help-question-text" className="mt-1 text-xs text-gray-500">Write a clear, action‑oriented question. Example: "Are fire extinguishers mounted?"</p>
                    {modalErrors.text && <p className="mt-1 text-xs text-danger-600">{modalErrors.text}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="modal-question-type">Type</label>
                    <select id="modal-question-type" aria-describedby="help-type" className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={questionModal.draft!.type} onChange={(e) => onDraftTypeChange(e.target.value as QuestionType)}>
                      {Object.values(QuestionType).map(t => (
                        <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <p id="help-type" className="mt-1 text-xs text-gray-500">Some types include additional settings below.</p>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input id="modal-required" type="checkbox" className="h-5 w-5" checked={questionModal.draft!.required} onChange={(e) => updateDraftField('required', e.target.checked)} />
                    <label htmlFor="modal-required" className="label m-0">Required</label>
                  </div>
                </div>
              </fieldset>

            {questionModal.draft.type === QuestionType.YES_NO && (
              <fieldset role="group" className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <TrophyIcon className="w-4 h-4" />
                  Scoring
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 border rounded-lg bg-gray-50">
                  <div>
                    <label className="label">Award on</label>
                    <div className="mt-2 flex flex-col gap-2">
                      {(['yes','no'] as const).map(opt => {
                        const pressed = opt === 'yes' ? ((questionModal.draft!.yesWeight ?? 0) > 0) : ((questionModal.draft!.noWeight ?? 0) > 0)
                        return (
                          <button
                            key={opt}
                            type="button"
                            aria-pressed={pressed}
                            className={`w-full justify-start px-3 py-2 text-sm border rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${pressed ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                            onClick={() => setDraftAward(opt)}
                          >
                            {opt.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Choose when points should be awarded.</p>
                    {modalErrors.award && <p className="mt-1 text-xs text-danger-600">{modalErrors.award}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="modal-points">Points</label>
                    <input
                      id="modal-points"
                      type="number"
                      placeholder="0"
                      aria-invalid={!!modalErrors.points}
                      aria-describedby="help-points"
                      className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
                      value={pointsInputValue}
                      onChange={(e) => setDraftPoints(e.target.value)}
                    />
                    <p id="help-points" className="mt-1 text-xs text-gray-500">Set to 0 for no scoring. Points are awarded only when the answer matches your choice above.</p>
                    {modalErrors.points && <p className="mt-1 text-xs text-danger-600">{modalErrors.points}</p>}
                  </div>
                </div>
              </fieldset>
            )}

            {(questionModal.draft.type === QuestionType.MULTIPLE_CHOICE || questionModal.draft.type === QuestionType.CHECKBOX) && (
              <fieldset role="group" className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ListBulletIcon className="w-4 h-4" />
                  Options
                </legend>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <label className="label">Options</label>
                  <p className="mt-1 text-xs text-gray-500">Add at least two options. Drag with buttons to reorder.</p>
                  {modalErrors.options && <p className="mt-1 text-xs text-danger-600">{modalErrors.options}</p>}
                  <ul className="mt-2 space-y-2">
                    {(questionModal.draft!.options || []).map((opt, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input className="input flex-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={opt} onChange={(e) => updateDraftOption(i, e.target.value)} />
                        <button className="btn btn-ghost btn-xs" title="Up" onClick={() => moveDraftOption(i, 'up')}><ChevronUpIcon className="w-4 h-4"/></button>
                        <button className="btn btn-ghost btn-xs" title="Down" onClick={() => moveDraftOption(i, 'down')}><ChevronDownIcon className="w-4 h-4"/></button>
                        <button className="btn btn-ghost btn-xs text-danger-600" title="Delete" onClick={() => removeDraftOption(i)}><TrashIcon className="w-4 h-4"/></button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <input className="input flex-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" placeholder="Add option" onKeyDown={(e) => { if (e.key === 'Enter') { addDraftOption((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { const inp = (e.currentTarget.previousElementSibling as HTMLInputElement); if (inp?.value) { addDraftOption(inp.value); inp.value=''; } }}>Add</button>
                  </div>
                </div>
              </fieldset>
            )}

            {questionModal.draft.type === QuestionType.NUMBER && (
              <fieldset role="group" className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldCheckIcon className="w-4 h-4" />
                  Validation
                </legend>
                <details className="p-4 border rounded-lg bg-gray-50">
                  <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">Advanced validation</summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Min</label>
                      <input type="number" aria-describedby="help-min" className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={questionModal.draft!.validation?.min ?? ''} onChange={(e) => setDraftValidation('min', Number(e.target.value))} />
                      <p id="help-min" className="mt-1 text-xs text-gray-500">Leave blank to allow any minimum.</p>
                    </div>
                    <div>
                      <label className="label">Max</label>
                      <input type="number" aria-describedby="help-max" className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={questionModal.draft!.validation?.max ?? ''} onChange={(e) => setDraftValidation('max', Number(e.target.value))} />
                      <p id="help-max" className="mt-1 text-xs text-gray-500">Leave blank to allow any maximum.</p>
                    </div>
                    {modalErrors.range && <div className="md:col-span-2"><p className="mt-1 text-xs text-danger-600">{modalErrors.range}</p></div>}
                  </div>
                </details>
              </fieldset>
            )}

            {questionModal.draft.type === QuestionType.TEXT && (
              <fieldset role="group" className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldCheckIcon className="w-4 h-4" />
                  Validation
                </legend>
                <details className="p-4 border rounded-lg bg-gray-50">
                  <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">Advanced validation</summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="modal-pattern">Pattern (regex)</label>
                      <input id="modal-pattern" aria-invalid={!!modalErrors.pattern} aria-describedby="help-pattern" className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={questionModal.draft!.validation?.pattern ?? ''} onChange={(e) => setDraftValidation('pattern', e.target.value)} placeholder="^.{1,100}$" />
                      <p id="help-pattern" className="mt-1 text-xs text-gray-500">Example: <code>^.{'{'}1,100{'}'}$</code> allows 1–100 characters.</p>
                      {modalErrors.pattern && <p className="mt-1 text-xs text-danger-600">{modalErrors.pattern}</p>}
                    </div>
                    <div>
                      <label className="label">Message</label>
                      <input className="input mt-1 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1" value={questionModal.draft!.validation?.message ?? ''} onChange={(e) => setDraftValidation('message', e.target.value)} placeholder="Please enter up to 100 chars" />
                    </div>
                  </div>
                </details>
              </fieldset>
            )}

            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button className="btn btn-outline btn-md" onClick={closeQuestionModal}>Cancel</button>
              <button
                className="btn btn-primary btn-md"
                onClick={saveQuestionFromModal}
                disabled={
                  !questionModal.draft!.text.trim() ||
                  Object.keys(modalErrors).length > 0 ||
                  (
                    questionModal.draft!.type === QuestionType.YES_NO &&
                    (parseFloat(pointsInputValue || '0') > 0) &&
                    ((questionModal.draft!.yesWeight ?? 0) === 0 && (questionModal.draft!.noWeight ?? 0) === 0)
                  )
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default SurveyTemplateEditor
