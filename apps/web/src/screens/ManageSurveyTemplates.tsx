import React from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Survey, AuditFrequency } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useAuthStore } from '../stores/auth'
import StatCard from '../components/StatCard'
import ResponsiveTable from '../components/ResponsiveTable'
import { ClipboardDocumentListIcon, CheckCircleIcon, FolderIcon } from '@heroicons/react/24/outline'

const ManageSurveyTemplates: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: QK.SURVEYS,
    queryFn: api.getSurveys,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createSurvey({
        title: 'Untitled Survey',
        description: '',
        sections: [],
        createdBy: user?.id || 'user-3',
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: QK.SURVEYS })
      if (created?.id) navigate(`/manage/surveys/${created.id}/edit`)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.duplicateSurvey(id, user?.id || 'user-3'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.SURVEYS }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSurvey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.SURVEYS }),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (s: Survey) => api.updateSurvey(s.id, { isActive: !s.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.SURVEYS }),
  })

  const updateFrequencyMutation = useMutation({
    mutationFn: (payload: { id: string; frequency: AuditFrequency }) => api.updateSurvey(payload.id, { frequency: payload.frequency }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.SURVEYS }),
  })

  return (
    <DashboardLayout title="Manage Survey Templates">
      <div className="space-y-6">
        {/* Header + actions */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Survey Templates</h2>
              <p className="text-gray-600">Create, duplicate, and manage your audit templates.</p>
            </div>
            <button data-testid="create-template" className="btn-primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create New Template'}
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Templates" value={surveys.length} subtitle="All templates" variant="primary" icon={<ClipboardDocumentListIcon className="w-6 h-6 text-primary-700" />} />
          <StatCard title="Active" value={surveys.filter(s => s.isActive).length} subtitle="Usable now" variant="success" icon={<CheckCircleIcon className="w-6 h-6 text-success-700" />} />
          <StatCard title="Total Sections" value={surveys.reduce((sum, s) => sum + (s.sections?.length || 0), 0)} subtitle="Across templates" variant="neutral" icon={<FolderIcon className="w-6 h-6 text-gray-700" />} />
        </div>

        <div className="card" data-testid="template-library-card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Template Library</h3>
          </div>
          <div className="p-6" data-testid="template-table-container">
            {isLoading ? (
              <p className="text-gray-500 py-8">Loading templates…</p>
            ) : (
              <ResponsiveTable
                items={surveys}
                keyField={(s) => s.id}
                empty={<p className="text-gray-500 py-8">No templates found.</p>}
                mobileItem={(s) => (
                  <div className="card-compact card-interactive bg-white border border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{s.title}</p>
                        <p className="text-xs text-gray-500">v{s.version} • {s.sections?.length || 0} sections • {s.isActive ? 'Active' : 'Inactive'}</p>
                        <p className="text-xs text-gray-400">Updated {new Date(s.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button data-testid="edit-template" data-id={s.id} className="btn-outline btn-sm" onClick={() => navigate(`/manage/surveys/${s.id}/edit`)}>Edit</button>
                      <button data-testid="duplicate-template" data-id={s.id} className="btn-secondary btn-sm" onClick={() => duplicateMutation.mutate(s.id)} disabled={duplicateMutation.isPending}>Duplicate</button>
                      <button data-testid="toggle-active-template" data-id={s.id} className="btn-outline btn-sm" onClick={() => toggleActiveMutation.mutate(s)} disabled={toggleActiveMutation.isPending}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button data-testid="delete-template" data-id={s.id} className="btn-danger btn-sm" onClick={() => deleteMutation.mutate(s.id)} disabled={deleteMutation.isPending}>Delete</button>
                    </div>
                  </div>
                )}
                columns={[
                  { key: 'title', header: 'Title', render: (s) => s.title },
                  { key: 'version', header: 'Version', render: (s) => `v${s.version}` },
                  { key: 'sections', header: 'Sections', render: (s) => s.sections?.length || 0 },
                  { key: 'frequency', header: 'Frequency', render: (s) => (
                    <select
                      className="input"
                      value={s.frequency || AuditFrequency.UNLIMITED}
                      onChange={(e) => updateFrequencyMutation.mutate({ id: s.id, frequency: e.target.value as AuditFrequency })}
                      title="Survey audit frequency per branch"
                    >
                      <option value={AuditFrequency.UNLIMITED}>Unlimited</option>
                      <option value={AuditFrequency.DAILY}>Daily</option>
                      <option value={AuditFrequency.WEEKLY}>Weekly</option>
                      <option value={AuditFrequency.MONTHLY}>Monthly</option>
                      <option value={AuditFrequency.QUARTERLY}>Quarterly</option>
                    </select>
                  ) },
                  { key: 'active', header: 'Active', render: (s) => (s.isActive ? 'Yes' : 'No') },
                  { key: 'updated', header: 'Updated', render: (s) => new Date(s.updatedAt).toLocaleDateString() },
                  {
                    key: 'actions',
                    header: '',
                    className: 'text-right',
                    render: (s) => (
                      <div className="space-x-2">
                        <button data-testid="edit-template" data-id={s.id} className="btn-outline btn-sm" onClick={() => navigate(`/manage/surveys/${s.id}/edit`)}>Edit</button>
                        <button data-testid="duplicate-template" data-id={s.id} className="btn-secondary btn-sm" onClick={() => duplicateMutation.mutate(s.id)} disabled={duplicateMutation.isPending}>Duplicate</button>
                        <button data-testid="toggle-active-template" data-id={s.id} className="btn-outline btn-sm" onClick={() => toggleActiveMutation.mutate(s)} disabled={toggleActiveMutation.isPending}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button data-testid="delete-template" data-id={s.id} className="btn-danger btn-sm" onClick={() => deleteMutation.mutate(s.id)} disabled={deleteMutation.isPending}>Delete</button>
                      </div>
                    )
                  }
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ManageSurveyTemplates
