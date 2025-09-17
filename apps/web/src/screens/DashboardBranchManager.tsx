import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'

const DashboardBranchManager: React.FC = () => {
  const { user } = useAuthStore()

  return (
    <DashboardLayout title="Branch Manager Dashboard">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Welcome back, {user?.name}! 🏬
          </h2>
          <p className="text-gray-600">
            Manage audits and oversee branch operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Audits</h3>
            <p className="text-3xl font-bold text-primary-600">24</p>
            <p className="text-sm text-gray-500">This month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pending Review</h3>
            <p className="text-3xl font-bold text-warning-600">8</p>
            <p className="text-sm text-gray-500">Awaiting approval</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Approved</h3>
            <p className="text-3xl font-bold text-success-600">15</p>
            <p className="text-sm text-gray-500">This month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Rate</h3>
            <p className="text-3xl font-bold text-success-600">87%</p>
            <p className="text-sm text-gray-500">Average score</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Branch Audit Overview</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              Branch audit management interface will be implemented here
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardBranchManager
