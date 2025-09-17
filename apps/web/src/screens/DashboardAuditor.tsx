import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'

const DashboardAuditor: React.FC = () => {
  const { user } = useAuthStore()

  return (
    <DashboardLayout title="Auditor Dashboard">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Welcome back, {user?.name}! 🕵️‍♂️
          </h2>
          <p className="text-gray-600">
            Here you can view and complete your assigned audits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pending Audits</h3>
            <p className="text-3xl font-bold text-primary-600">5</p>
            <p className="text-sm text-gray-500">Awaiting completion</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">In Progress</h3>
            <p className="text-3xl font-bold text-warning-600">2</p>
            <p className="text-sm text-gray-500">Currently working on</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-success-600">12</p>
            <p className="text-sm text-gray-500">This month</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Audits</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              Audit list will be implemented here
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardAuditor
