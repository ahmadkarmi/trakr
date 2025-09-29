import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { useAuthStore } from './stores/auth'
import { UserRole } from '@trakr/shared'
import { ToastProvider } from './components/ToastProvider'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen'
import { usePWA } from './hooks/usePWA'
import { LoadingProvider } from './contexts/LoadingContext'
import { ErrorToastContainer } from './components/ErrorToast'
import { OfflineBanner } from './components/OfflineStatus'
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring'
import { testMultipleBranchManagerSystem } from './test-integration'
import LoginScreen from './screens/LoginScreen'
import PWAInstallPrompt from './components/PWAInstallPrompt'

// Lazy load all other screens for code splitting
const DashboardAuditor = lazy(() => import('./screens/DashboardAuditor'))
const DashboardBranchManager = lazy(() => import('./screens/DashboardBranchManager'))
const DashboardAdmin = lazy(() => import('./screens/DashboardAdmin'))
const AuditWizard = lazy(() => import('./screens/AuditWizard'))
const AuditDetail = lazy(() => import('./screens/AuditDetail'))
const AuditSummary = lazy(() => import('./screens/AuditSummary'))
const Settings = lazy(() => import('./screens/Settings'))
const ManageSurveyTemplates = lazy(() => import('./screens/ManageSurveyTemplates'))
const SurveyTemplateEditor = lazy(() => import('./screens/SurveyTemplateEditor'))
const ActivityLogs = lazy(() => import('./screens/ActivityLogs'))
const ManageBranches = lazy(() => import('./screens/ManageBranches'))
const ManageZones = lazy(() => import('./screens/ManageZones'))
const ManageAssignments = lazy(() => import('./screens/ManageAssignments'))
const ProfileSignature = lazy(() => import('./screens/ProfileSignature'))
const Help = lazy(() => import('./screens/Help'))
const Profile = lazy(() => import('./screens/Profile'))

function App() {
  const { user, isLoading, init } = useAuthStore()
  const { updateAvailable, updateApp } = usePWA()
  const { logMetrics, sendMetricsToAnalytics } = usePerformanceMonitoring()

  // Make test function available globally for browser console testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testMultipleBranchManagerSystem = testMultipleBranchManagerSystem
    }
  }, [])

  // Hydrate auth session (Supabase) and subscribe to changes
  useEffect(() => {
    init().catch(() => {})
    
    // Log performance metrics after app loads
    setTimeout(() => {
      logMetrics()
      sendMetricsToAnalytics({ appVersion: '1.0.0' })
    }, 5000)
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
    <LoadingProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
          <div className="min-h-screen bg-gray-50">
            {/* Offline Banner */}
            <OfflineBanner />
            
            {/* Update available notification */}
            {updateAvailable && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-800">A new version is available!</p>
                  <button
                    onClick={updateApp}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
            
            <Suspense fallback={<LoadingScreen message="Loading page..." showSkeleton={true} />}>
              <Routes>
                {/* Public routes */}
                <Route 
                  path="/login" 
                  element={
                    user ? 
                      <Navigate to={getHomeRouteForRole(user.role)} replace /> : 
                      <LoginScreen />
                  } 
                />

                {/* Protected routes */}
                {user ? (
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
            </Suspense>
            
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
            
            {/* Global Error Toast Container */}
            <ErrorToastContainer />
          </div>
        </ErrorBoundary>
      </Router>
    </ToastProvider>
    </LoadingProvider>
  )
}

export default App
