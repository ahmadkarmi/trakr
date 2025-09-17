import React from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const AuditSummary: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()

  return (
    <DashboardLayout title="Audit Summary">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Audit Summary - {auditId}
        </h2>
        <p className="text-gray-600">
          The audit summary view will be implemented here.
          This will show scoring, compliance metrics, and export options.
        </p>
      </div>
    </DashboardLayout>
  )
}

export default AuditSummary
