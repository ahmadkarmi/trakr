import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'

const DashboardAdmin: React.FC = () => {
  const { user } = useAuthStore()

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Welcome back, {user?.name}! 🛠️
          </h2>
          <p className="text-gray-600">
            Manage the entire audit system, users, and templates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-primary-600">156</p>
            <p className="text-sm text-gray-500">Active users</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Templates</h3>
            <p className="text-3xl font-bold text-primary-600">12</p>
            <p className="text-sm text-gray-500">Active templates</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Branches</h3>
            <p className="text-3xl font-bold text-primary-600">8</p>
            <p className="text-sm text-gray-500">Across organization</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">System Health</h3>
            <p className="text-3xl font-bold text-success-600">98%</p>
            <p className="text-sm text-gray-500">Uptime</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full btn-primary text-left">
                Manage Survey Templates
              </button>
              <button className="w-full btn-outline text-left">
                Manage Users
              </button>
              <button className="w-full btn-outline text-left">
                View System Logs
              </button>
              <button className="w-full btn-outline text-left">
                Export Reports
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-center py-8">
                Activity feed will be implemented here
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardAdmin
