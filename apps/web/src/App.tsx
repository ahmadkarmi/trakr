import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, Suspense, lazy, useRef } from 'react'
import { useAuthStore } from './stores/auth'
import { UserRole } from '@trakr/shared'
import { ToastProvider } from './components/ToastProvider'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen'
import { usePWA } from './hooks/usePWA'
import { LoadingProvider } from './contexts/LoadingContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ErrorToastContainer } from './components/ErrorToast'
import { OfflineBanner } from './components/OfflineStatus'
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring'
import { useDashboardPrefetch } from './hooks/useDashboardPrefetch'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import { useToast } from './hooks/useToast'
import { ApiHealthBanner } from './components/ApiHealthBanner'
import { useFocusRefetch } from './hooks/useFocusRefetch'
import { logger } from './utils/logger'

// Per-route error fallback — contained, not full-screen, preserves nav chrome
const RouteFallback = ({ error, retry }: { error: Error; retry: () => void }) => {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="max-w-sm w-full">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Page failed to load</h2>
        <p className="text-sm text-gray-500 mb-6">{error.message || 'An unexpected error occurred on this page.'}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={retry} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
            Try again
          </button>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}

// Wraps a route element in its own ErrorBoundary so failures are page-scoped
const RouteBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary fallback={RouteFallback}>{children}</ErrorBoundary>
)

const SessionWatcher = () => {
  const sessionError = useAuthStore((state) => state.sessionError)
  const { showToast } = useToast()
  const lastMessageRef = useRef<string | null>(null)

  useEffect(() => {
    if (sessionError && lastMessageRef.current !== sessionError) {
      showToast({
        message: sessionError,
        variant: 'warning',
        duration: 7000,
      })
      lastMessageRef.current = sessionError
    }
  }, [sessionError, showToast])

  return null
}

const SessionExpiryBanner = () => {
  const sessionError = useAuthStore((state) => state.sessionError)
  const acknowledge = useAuthStore((state) => state.acknowledgeSessionError)
  const signOut = useAuthStore((state) => state.signOut)

  if (!sessionError) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-800 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold">Session expired</p>
          <p className="text-red-700">{sessionError}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-danger btn-sm" onClick={() => signOut()}>
            Log in again
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => acknowledge()}>
            Dismiss
          </button>
          <button
            onClick={() => acknowledge()}
            className="shrink-0 p-1 hover:bg-red-100 rounded-sm transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Lazy load all screens for code splitting
const LoginScreen = lazy(() => import('./screens/LoginScreen'))
const AdminOnboarding = lazy(() => import('./screens/AdminOnboarding'))
const UserOnboarding = lazy(() => import('./screens/UserOnboarding'))
const DashboardAuditor = lazy(() => import('./screens/DashboardAuditor'))
const DashboardBranchManager = lazy(() => import('./screens/DashboardBranchManager'))
const DashboardAdmin = lazy(() => import('./screens/DashboardAdmin'))
const AuditWizard = lazy(() => import('./screens/AuditWizard'))
const AuditDetail = lazy(() => import('./screens/AuditDetail'))
const AuditSummary = lazy(() => import('./screens/AuditSummary'))
const AuditReviewScreen = lazy(() => import('./screens/AuditReviewScreen'))
const Settings = lazy(() => import('./screens/Settings'))
const ManageSurveyTemplates = lazy(() => import('./screens/ManageSurveyTemplates'))
const SurveyTemplateEditor = lazy(() => import('./screens/SurveyTemplateEditor'))
const ActivityLogs = lazy(() => import('./screens/ActivityLogs'))
const ManageBranches = lazy(() => import('./screens/ManageBranches'))
const ManageZones = lazy(() => import('./screens/ManageZones'))
const ManageAssignments = lazy(() => import('./screens/ManageAssignments'))
const ManageUsers = lazy(() => import('./screens/ManageUsers'))
const ProfileSignature = lazy(() => import('./screens/ProfileSignature'))
const Help = lazy(() => import('./screens/Help'))
const Profile = lazy(() => import('./screens/Profile'))
const Analytics = lazy(() => import('./screens/Analytics'))
const SearchResults = lazy(() => import('./screens/SearchResults'))
const Notifications = lazy(() => import('./screens/Notifications'))
const DevBackendCheck = lazy(() => import('./screens/DevBackendCheck'))
const Landing = lazy(() => import('./screens/Landing'))

function App() {
  const { user, isLoading, init } = useAuthStore()
  useFocusRefetch()
  const { updateAvailable, updateApp } = usePWA()
  const { logMetrics, sendMetricsToAnalytics } = usePerformanceMonitoring()
  
  // Prefetch dashboard data while user is signing in
  useDashboardPrefetch()

  // Hydrate auth session (Supabase) and subscribe to changes
  useEffect(() => {
    init().catch((e) => logger.error('Auth init failed', e, { context: 'App' }))
    
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
        {/** Session error watcher must be inside ToastProvider */}
        <SessionWatcher />
        <Router>
          <OrganizationProvider>
            <ErrorBoundary>
          <div className="app-shell">
            {/* Offline + session + API banners */}
            <OfflineBanner />
            <SessionExpiryBanner />
            <ApiHealthBanner />
            
            {/* Update available notification */}
            {updateAvailable && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-800">A new version is available!</p>
                  <button
                    onClick={updateApp}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-sm hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex-1">
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
                <Route 
                  path="/" 
                  element={
                    user ? (
                      !user.orgId ? (
                        // Users without orgId need onboarding
                        user.role === UserRole.ADMIN ? (
                          <Navigate to="/onboarding/admin" replace />
                        ) : (
                          <Navigate to="/onboarding/user" replace />
                        )
                      ) : (
                        <Navigate to={getHomeRouteForRole(user.role)} replace />
                      )
                    ) : (
                      <Landing />
                    )
                  }
                />

                {/* Onboarding routes (public/authenticated) */}
                <Route path="/onboarding/admin" element={<AdminOnboarding />} />
                <Route path="/onboarding/user" element={<UserOnboarding />} />

                {/* Protected routes */}
                {user ? (
                  <>
                    
                    {/* Dashboard routes */}
                    <Route path="/dashboard/auditor" element={<RouteBoundary><DashboardAuditor /></RouteBoundary>} />
                    <Route path="/dashboard/branch-manager" element={<RouteBoundary><DashboardBranchManager /></RouteBoundary>} />
                    <Route path="/dashboard/admin" element={<RouteBoundary><DashboardAdmin /></RouteBoundary>} />
                    <Route path="/notifications" element={<RouteBoundary><Notifications /></RouteBoundary>} />
                    <Route path="/analytics" element={<RouteBoundary><Analytics /></RouteBoundary>} />
                    <Route path="/activity/logs" element={<RouteBoundary><ActivityLogs /></RouteBoundary>} />
                    <Route path="/settings" element={<RouteBoundary><Settings /></RouteBoundary>} />
                    <Route path="/profile/signature" element={<RouteBoundary><ProfileSignature /></RouteBoundary>} />
                    <Route path="/help" element={<RouteBoundary><Help /></RouteBoundary>} />
                    <Route path="/profile" element={<RouteBoundary><Profile /></RouteBoundary>} />
                    <Route path="/search" element={<RouteBoundary><SearchResults /></RouteBoundary>} />
                    <Route path="/dev/backend-check" element={<RouteBoundary><DevBackendCheck /></RouteBoundary>} />

                    {/* Audit routes */}
                    <Route path="/audit/:auditId/wizard" element={<RouteBoundary><AuditWizard /></RouteBoundary>} />
                    <Route path="/audit/:auditId/review" element={<RouteBoundary><AuditReviewScreen /></RouteBoundary>} />
                    <Route path="/audit/:auditId" element={<RouteBoundary><AuditDetail /></RouteBoundary>} />
                    <Route path="/audit/:auditId/summary" element={<RouteBoundary><AuditSummary /></RouteBoundary>} />
                    <Route path="/audits/:auditId/summary" element={<RouteBoundary><AuditSummary /></RouteBoundary>} />

                    {/* Template management routes (Admin & Super Admin only) */}
                    {isAdmin ? (
                      <>
                        <Route path="/manage/surveys" element={<RouteBoundary><ManageSurveyTemplates /></RouteBoundary>} />
                        <Route path="/manage/surveys/create" element={<RouteBoundary><SurveyTemplateEditor /></RouteBoundary>} />
                        <Route path="/manage/surveys/:surveyId/edit" element={<RouteBoundary><SurveyTemplateEditor /></RouteBoundary>} />
                        <Route path="/manage/branches" element={<RouteBoundary><ManageBranches /></RouteBoundary>} />
                        <Route path="/manage/zones" element={<RouteBoundary><ManageZones /></RouteBoundary>} />
                        <Route path="/manage/assignments" element={<RouteBoundary><ManageAssignments /></RouteBoundary>} />
                        <Route path="/manage/users" element={<RouteBoundary><ManageUsers /></RouteBoundary>} />
                      </>
                    ) : (
                      <>
                        <Route path="/manage/surveys" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                        <Route path="/manage/surveys/create" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                        <Route path="/manage/surveys/:surveyId/edit" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                        <Route path="/manage/branches" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                        <Route path="/manage/zones" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                        <Route path="/manage/assignments" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                        <Route path="/manage/users" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                      </>
                    )}

                    {/* Catch all - redirect to appropriate dashboard */}
                    <Route path="*" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
                  </>
                ) : (
                  <Route path="*" element={<Navigate to="/" replace />} />
                )}
              </Routes>
            </Suspense>
            </div>
            
            {/* PWA Install Prompt - only show for authenticated users */}
            {user && <PWAInstallPrompt />}

            {/* Global Error Toast Container */}
            <ErrorToastContainer />
          </div>
            </ErrorBoundary>
          </OrganizationProvider>
        </Router>
      </ToastProvider>
    </LoadingProvider>
  )
}

export default App
