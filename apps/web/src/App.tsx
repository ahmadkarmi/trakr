import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth'
import { UserRole } from '@trakr/shared'
import { ToastProvider } from './components/ToastProvider'
import ErrorBoundary from './components/ErrorBoundary'

// Components
import LoginScreen from './screens/LoginScreen'
import DashboardAuditor from './screens/DashboardAuditor'
import DashboardBranchManager from './screens/DashboardBranchManager'
import DashboardAdmin from './screens/DashboardAdmin'
import AuditWizard from './screens/AuditWizard'
import AuditDetail from './screens/AuditDetail'
import AuditSummary from './screens/AuditSummary'
import Settings from './screens/Settings'
import ManageSurveyTemplates from './screens/ManageSurveyTemplates'
import SurveyTemplateEditor from './screens/SurveyTemplateEditor'
import LoadingScreen from './components/LoadingScreen'
import ActivityLogs from './screens/ActivityLogs'
import ManageBranches from './screens/ManageBranches'
import ManageZones from './screens/ManageZones'
import ManageAssignments from './screens/ManageAssignments'
import ProfileSignature from './screens/ProfileSignature'
import Help from './screens/Help'
import Profile from './screens/Profile'

function App() {
  const { isAuthenticated, user, isLoading, init } = useAuthStore()

  // Hydrate auth session (Supabase) and subscribe to changes
  useEffect(() => {
    init().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  const getHomeRouteForRole = (role: UserRole): string => {
    switch (role) {
      case UserRole.AUDITOR:
        return '/dashboard/auditor'
      case UserRole.BRANCH_MANAGER:
        return '/dashboard/branch-manager'
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return '/dashboard/admin'
      default:
        return '/login'
    }
  }

  const isAdmin = !!user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)

  return (
    <ToastProvider>
      <Router>
        <ErrorBoundary>
          <div className="min-h-screen bg-gray-50">
            <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to={getHomeRouteForRole(user!.role)} replace /> : 
                <LoginScreen />
            } 
          />

          {/* Protected routes */}
          {isAuthenticated ? (
            <>
              <Route 
                path="/" 
                element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} 
              />
              
              {/* Dashboard routes */}
              <Route path="/dashboard/auditor" element={<DashboardAuditor />} />
              <Route path="/dashboard/branch-manager" element={<DashboardBranchManager />} />
              <Route path="/dashboard/admin" element={<DashboardAdmin />} />
              <Route path="/activity/logs" element={<ActivityLogs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile/signature" element={<ProfileSignature />} />
              <Route path="/help" element={<Help />} />
              <Route path="/profile" element={<Profile />} />

              {/* Audit routes */}
              <Route path="/audit/:auditId/wizard" element={<AuditWizard />} />
              <Route path="/audit/:auditId" element={<AuditDetail />} />
              <Route path="/audit/:auditId/summary" element={<AuditSummary />} />

              {/* Template management routes (Admin & Super Admin only) */}
              {isAdmin ? (
                <>
                  <Route path="/manage/surveys" element={<ManageSurveyTemplates />} />
                  <Route path="/manage/surveys/create" element={<SurveyTemplateEditor />} />
                  <Route path="/manage/surveys/:surveyId/edit" element={<SurveyTemplateEditor />} />
                  <Route path="/manage/branches" element={<ManageBranches />} />
                  <Route path="/manage/zones" element={<ManageZones />} />
                  <Route path="/manage/assignments" element={<ManageAssignments />} />
                </>
              ) : (
                <>
                  <Route path="/manage/surveys" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                  <Route path="/manage/surveys/create" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                  <Route path="/manage/surveys/:surveyId/edit" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                  <Route path="/manage/branches" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                  <Route path="/manage/zones" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                  <Route path="/manage/assignments" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                </>
              )}

              {/* Catch all - redirect to appropriate dashboard */}
              <Route path="*" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
            </Routes>
          </div>
        </ErrorBoundary>
      </Router>
    </ToastProvider>
  )
}

export default App
