import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '@/components/StatusBadge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Audit, Survey, QuestionType } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useAuthStore } from '../stores/auth'

const AuditDetail: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: audit, isLoading: loadingAudit } = useQuery<Audit | null>({
    queryKey: QK.AUDIT(auditId),
    queryFn: () => (auditId ? api.getAuditById(auditId) : Promise.resolve(null)),
    enabled: !!auditId,
  })

  const { data: survey, isLoading: loadingSurvey } = useQuery<Survey | null>({
    queryKey: QK.SURVEY(audit?.surveyId),
    queryFn: () => (audit?.surveyId ? api.getSurveyById(audit!.surveyId) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  })

  const weightedNaQuestions = useMemo(() => {
    if (!audit || !survey) return [] as { sectionTitle: string; id: string; text: string; maxPoints: number }[]
    const rows: { sectionTitle: string; id: string; text: string; maxPoints: number }[] = []
    survey.sections.forEach(sec => {
      sec.questions.forEach(q => {
        if (q.isWeighted && q.type === QuestionType.YES_NO) {
          const resp = audit.responses[q.id]
          if (resp === 'na' || audit.overrideScores?.[q.id] != null) {
            const maxPoints = Math.max(q.yesWeight ?? 0, q.noWeight ?? 0)
            rows.push({ sectionTitle: sec.title, id: q.id, text: q.text, maxPoints })
          }
        }
      })
    })
    return rows
  }, [audit, survey])

  const [overrides, setOverrides] = useState<Record<string, { points: number; note: string }>>({})

  React.useEffect(() => {
    if (audit) {
      const init: Record<string, { points: number; note: string }> = {}
      Object.keys(audit.overrideScores || {}).forEach(qid => {
        init[qid] = { points: audit.overrideScores![qid] ?? 0, note: audit.overrideNotes?.[qid] || '' }
      })
      setOverrides(init)
    }
  }, [audit])

  const setOverrideMutation = useMutation({
    mutationFn: async (payload: { questionId: string; points: number; note: string }) => {
      if (!auditId || !user) return Promise.reject(new Error('Missing context'))
      return api.setOverrideScore(auditId, payload.questionId, payload.points, payload.note, user.id)
    },
    onSuccess: () => {
      if (auditId) {
        qc.invalidateQueries({ queryKey: QK.AUDIT(auditId) })
        qc.invalidateQueries({ queryKey: QK.AUDITS() })
      }
    },
  })

  return (
    <DashboardLayout title="Audit Details">
      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Audit Details - {auditId}</h2>
          {loadingAudit || loadingSurvey ? (
            <p className="text-gray-500">Loading…</p>
          ) : !audit || !survey ? (
            <p className="text-gray-500">Audit or Survey not found.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Survey: {survey.title} (v{audit.surveyVersion})</p>
              <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">Status: <StatusBadge status={audit.status} /></div>
              <p className="text-sm text-gray-600">Updated: {new Date(audit.updatedAt).toLocaleString()}</p>
            </>
          )}
        </div>

        {/* Admin Overrides for N/A on weighted questions */}
        {audit && survey && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 -mx-6 -mt-4 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Overrides (N/A on Weighted)</h3>
            </div>
            {weightedNaQuestions.length === 0 ? (
              <p className="text-gray-500">No weighted N/A questions found.</p>
            ) : (
              <div className="space-y-3">
                {weightedNaQuestions.map((row) => {
                  const current = overrides[row.id] ?? { points: audit.overrideScores?.[row.id] ?? 0, note: audit.overrideNotes?.[row.id] ?? '' }
                  return (
                    <div key={row.id} className="border border-gray-200 rounded-md p-3">
                      <p className="text-sm text-gray-500">{row.sectionTitle}</p>
                      <p className="font-medium text-gray-900">{row.text}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="label">Override Points (0–{row.maxPoints})</label>
                          <input
                            type="number"
                            min={0}
                            max={row.maxPoints}
                            className="input mt-1"
                            value={current.points}
                            onChange={(e) => setOverrides(prev => ({ ...prev, [row.id]: { ...current, points: Number(e.target.value) } }))}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">Note</label>
                          <input
                            className="input mt-1"
                            value={current.note}
                            onChange={(e) => setOverrides(prev => ({ ...prev, [row.id]: { ...current, note: e.target.value } }))}
                            placeholder="Reason for override (optional)"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => setOverrideMutation.mutate({ questionId: row.id, points: Math.max(0, Math.min(row.maxPoints, overrides[row.id]?.points ?? 0)), note: overrides[row.id]?.note ?? '' })}
                          disabled={setOverrideMutation.isPending}
                        >
                          {setOverrideMutation.isPending ? 'Saving…' : 'Save Override'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AuditDetail
