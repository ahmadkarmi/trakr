import React, { useState } from 'react'
import { UserRole, USER_ROLE_LABELS } from '@trakr/shared'
import { useAuthStore } from '../stores/auth'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'
import { useErrorHandler } from '../hooks/useErrorHandler'

const LoginScreen: React.FC = () => {
  const { signIn, signInWithCredentials, isLoading } = useAuthStore()
  const { error: appError, handleSupabaseError, createError, clearError } = useErrorHandler()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const handleRoleLogin = async (role: UserRole) => {
    await signIn(role)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setResetMessage(null)
    try {
      await signInWithCredentials(email, password)
    } catch (err: any) {
      handleSupabaseError(err, { 
        action: 'password-login',
        email: email 
      })
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      createError('data/validation-failed', new Error('Email required'), { field: 'email' })
      return
    }

    if (!hasSupabaseEnv()) {
      createError('app/feature-unavailable', new Error('Supabase not configured'))
      return
    }

    setIsResetting(true)
    clearError()
    setResetMessage(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      })

      if (error) {
        throw error
      }

      setResetMessage(`Password reset email sent to ${email}. Please check your inbox and follow the instructions.`)
    } catch (err: any) {
      handleSupabaseError(err, { 
        action: 'password-reset',
        email: email 
      })
    } finally {
      setIsResetting(false)
    }
  }

  const roleButtons = [
    { role: UserRole.ADMIN, icon: '🛠️' },
    { role: UserRole.BRANCH_MANAGER, icon: '🏬' },
    { role: UserRole.AUDITOR, icon: '🕵️‍♂️' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mobile-container">
      <div className="w-full max-w-md">
        <div className="card-mobile shadow-xl">
          <div className="text-center mobile-section">
            <h1 className="heading-mobile-xl text-gray-900 mb-2">Welcome to Trakr</h1>
            <p className="text-mobile-body text-gray-600">Sign in to your account</p>
          </div>

          {/* Email/Password Login Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-mobile"
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-mobile"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {appError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{appError.userMessage}</p>
              </div>
            )}
            
            {resetMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-600">{resetMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-mobile-primary"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            
            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                className="text-base text-primary-600 hover:text-primary-500 font-medium transition-colors disabled:opacity-50 touch-target"
                onClick={handleForgotPassword}
                disabled={isResetting}
              >
                {isResetting ? 'Sending reset email...' : 'Forgot your password?'}
            </button>
          </div>
        </form>

          {/* Divider */}
          <div className="relative mobile-section">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-mobile-body text-gray-500">or</span>
            </div>
          </div>

          {/* Quick Access Role Buttons */}
          <div className="mobile-section">
            <div className="text-center mb-4">
              <div className="heading-mobile-md text-gray-700 mb-2">Quick Access</div>
              <div className="text-mobile-caption text-gray-500">Choose your role to get started immediately</div>
            </div>
            <div className="space-y-3">
              {roleButtons.map(({ role, icon }) => (
                <button
                  key={role}
                  onClick={() => handleRoleLogin(role)}
                  disabled={isLoading}
                  className="btn-mobile-primary flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <span className="text-2xl">{icon}</span>
                  )}
                  <span>Login as {USER_ROLE_LABELS[role]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center mobile-section">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-mobile-caption text-gray-600 leading-relaxed space-y-2">
                <span className="block font-medium">Default credentials:</span>
                <span className="block">admin@trakr.com, branchmanager@trakr.com, auditor@trakr.com</span>
                <span className="block font-medium">Password: Password@123</span>
                <span className="block text-amber-600 mt-3">
                  If login fails, passwords may need to be set in Supabase Auth dashboard.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
