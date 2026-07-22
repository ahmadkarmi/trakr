import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Toggle } from './Toggle'
import { Textarea } from './Textarea'
import { logger } from '@/utils/logger'

export const OrgConfigPanel: React.FC = () => {
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [newFlag, setNewFlag] = useState('')

  const { data: config, isLoading } = useQuery({
    queryKey: ['org-config', effectiveOrgId],
    queryFn: () => api.getOrgConfig(effectiveOrgId),
    enabled: !!effectiveOrgId && isSuperAdmin,
  })

  const mutation = useMutation({
    mutationFn: (updates: Record<string, any>) => api.updateOrgConfig(effectiveOrgId!, updates, reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-config', effectiveOrgId] })
      setReason('')
      setNewFlag('')
    },
  })

  const toggleSetting = async (key: 'devMode' | 'exportsEnabled', value: boolean) => {
    if (!effectiveOrgId) return
    try {
      await mutation.mutateAsync({ [key]: value })
    } catch (error) {
      logger.error('Failed to update org config', error, { context: 'OrgConfig' })
    }
  }

  const handleAddFlag = async () => {
    const flag = newFlag.trim()
    if (!flag || mutation.isPending) return
    const existing: string[] = Array.isArray(config?.featureFlags) ? [...config.featureFlags] : []
    if (existing.includes(flag)) return
    try {
      await mutation.mutateAsync({ featureFlags: [...existing, flag] })
    } catch (error) {
      logger.error('Failed to add feature flag', error, { context: 'OrgConfig' })
    }
  }

  const handleRemoveFlag = async (flag: string) => {
    const existing: string[] = Array.isArray(config?.featureFlags) ? [...config.featureFlags] : []
    try {
      await mutation.mutateAsync({ featureFlags: existing.filter((f) => f !== flag) })
    } catch (error) {
      logger.error('Failed to remove feature flag', error, { context: 'OrgConfig' })
    }
  }

  if (!effectiveOrgId || !isSuperAdmin) return null

  const featureFlags = config?.featureFlags || []

  return (
    <div className="card">
      <div className="px-6 py-5 flex items-start justify-between border-b border-gray-100">
        <div>
          <p className="heading-micro mb-1">Org Configuration</p>
          <h3 className="heading-section-title">Advanced Controls</h3>
          <p className="heading-subtitle mt-1">Developer mode, exports, and feature flags scoped to this org.</p>
        </div>
        {isLoading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>
      <div className="px-6 py-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-section flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Developer Mode (org UI flag)</p>
              <p className="text-sm text-gray-500">Org-level flag for debug helpers. Does not affect data access or RLS — the production database enforces dev-mode off regardless (see is_dev_mode guardrail).</p>
            </div>
            <Toggle checked={Boolean(config?.devMode)} onChange={(value) => toggleSetting('devMode', value)} disabled={mutation.isPending} />
          </div>
          <div className="card-section flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Exports Enabled</p>
              <p className="text-sm text-gray-500">Permit data exports via the export toolkit.</p>
            </div>
            <Toggle checked={Boolean(config?.exportsEnabled)} onChange={(value) => toggleSetting('exportsEnabled', value)} disabled={mutation.isPending} />
          </div>
        </div>

        <div className="card-section space-y-3">
          <div>
            <p className="font-semibold text-gray-900">Feature Flags</p>
            <p className="heading-subtitle mt-0.5">Give this org access to beta-grade capabilities.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {featureFlags.length === 0 && <span className="text-sm text-gray-400">No flags enabled</span>}
            {featureFlags.map((flag: string) => (
              <span key={flag} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-primary-50 text-primary-700 border border-primary-100">
                {flag}
                <button className="text-primary-500 hover:text-primary-700" onClick={() => handleRemoveFlag(flag)} aria-label={`Remove ${flag}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              value={newFlag}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewFlag(event.target.value)}
              placeholder="Enter flag key"
              className="input"
            />
            <button
              className="btn btn-primary btn-sm whitespace-nowrap px-5"
              onClick={handleAddFlag}
              disabled={mutation.isPending}
            >
              Add Flag
            </button>
          </div>
        </div>

        <div className="card-section">
          <label className="block space-y-2">
            <span className="font-semibold text-gray-900">Reason for change (audit trail)</span>
            <Textarea
              value={reason}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
              rows={3}
              placeholder="Explain why this configuration was changed"
            />
            <p className="text-xs text-gray-500">Helpful for downstream audit visibility and export justification.</p>
          </label>
        </div>
      </div>
    </div>
  )
}
