import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { UserRole } from '@trakr/shared'

// Components
import LoginScreen from './screens/LoginScreen'
import DashboardAuditor from './screens/DashboardAuditor'
import DashboardBranchManager from './screens/DashboardBranchManager'
import DashboardAdmin from './screens/DashboardAdmin'
import AuditWizard from './screens/AuditWizard'
import AuditDetail from './screens/AuditDetail'
import AuditSummary from './screens/AuditSummary'
import ManageSurveyTemplates from './screens/ManageSurveyTemplates'
import SurveyTemplateEditor from './screens/SurveyTemplateEditor'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const { isAuthenticated, user, isLoading } = useAuthStore()

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

  return (
    <Router>
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

              {/* Audit routes */}
              <Route path="/audit/:auditId/wizard" element={<AuditWizard />} />
              <Route path="/audit/:auditId" element={<AuditDetail />} />
              <Route path="/audit/:auditId/summary" element={<AuditSummary />} />

              {/* Template management routes */}
              <Route path="/manage/surveys" element={<ManageSurveyTemplates />} />
              <Route path="/manage/surveys/create" element={<SurveyTemplateEditor />} />
              <Route path="/manage/surveys/:surveyId/edit" element={<SurveyTemplateEditor />} />

              {/* Catch all - redirect to appropriate dashboard */}
              <Route path="*" element={<Navigate to={getHomeRouteForRole(user!.role)} replace />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </Router>
  )
}

export default App
