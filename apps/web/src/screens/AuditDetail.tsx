import React from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const AuditDetail: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()

  return (
    <DashboardLayout title="Audit Details">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Audit Details - {auditId}
        </h2>
        <p className="text-gray-600">
          The audit detail view will be implemented here.
          This will show comprehensive audit information, responses, and attachments.
        </p>
      </div>
    </DashboardLayout>
  )
}

export default AuditDetail
