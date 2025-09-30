import React from 'react'
import { useAuthStore } from '../stores/auth'
import { UserRole } from '@trakr/shared'
import DashboardLayout from '../components/DashboardLayout'
import AdminAnalytics from './analytics/AdminAnalytics'
import BranchManagerAnalytics from './analytics/BranchManagerAnalytics'
import AuditorAnalytics from './analytics/AuditorAnalytics'

const Analytics: React.FC = () => {
  const { user } = useAuthStore()

  const renderAnalyticsDashboard = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return <AdminAnalytics />
      case UserRole.BRANCH_MANAGER:
        return <BranchManagerAnalytics />
      case UserRole.AUDITOR:
        return <AuditorAnalytics />
      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Not Available</h3>
            <p className="text-gray-500">Analytics access is not configured for your role.</p>
          </div>
        )
    }
  }

  const getPageTitle = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return 'System Analytics'
      case UserRole.BRANCH_MANAGER:
        return 'Branch Analytics'
      case UserRole.AUDITOR:
        return 'Personal Analytics'
      default:
        return 'Analytics'
    }
  }

  return (
    <DashboardLayout title={getPageTitle()}>
      {renderAnalyticsDashboard()}
    </DashboardLayout>
  )
}

export default Analytics
