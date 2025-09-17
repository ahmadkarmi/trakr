import React from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const AuditWizard: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()

  return (
    <DashboardLayout title="Audit Wizard">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Audit Wizard - {auditId}
        </h2>
        <p className="text-gray-600">
          The audit wizard interface will be implemented here.
          This will provide a step-by-step guided audit experience.
        </p>
      </div>
    </DashboardLayout>
  )
}

export default AuditWizard
