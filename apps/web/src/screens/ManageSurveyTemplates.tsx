import React from 'react'
import DashboardLayout from '../components/DashboardLayout'

const ManageSurveyTemplates: React.FC = () => {
  return (
    <DashboardLayout title="Manage Survey Templates">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Survey Templates</h2>
          <button className="btn-primary">
            Create New Template
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Template Library</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              Survey template management interface will be implemented here.
              This will allow creating, editing, and managing audit templates.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ManageSurveyTemplates
