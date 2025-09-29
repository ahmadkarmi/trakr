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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Modern Gradient Background with Organic Shapes */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
        {/* Organic Shape 1 - Top Left */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        {/* Organic Shape 2 - Bottom Right */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/15 rounded-full blur-2xl"></div>
        {/* Organic Shape 3 - Center */}
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-xl"></div>
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-purple-600">T</span>
          </div>
          <span className="text-white font-semibold text-lg">Trakr</span>
        </div>
        <div className="text-white/80 text-sm">
          Don't have an account? <span className="text-white font-medium cursor-pointer hover:underline">Sign up</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h1>
          </div>

          {/* Email/Password Login Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-500 font-medium transition-colors disabled:opacity-50"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                >
                  {isResetting ? 'Sending reset email...' : 'Forgot Password?'}
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            {appError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{appError.userMessage}</p>
              </div>
            )}
            
            {resetMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{resetMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-sm text-gray-500">or login with SSO</span>
            </div>
          </div>

          {/* Quick Access Role Buttons */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700 mb-2">Quick Access</div>
              <div className="text-sm text-gray-500">Choose your role to get started immediately</div>
            </div>
            <div className="space-y-3">
              {roleButtons.map(({ role, icon }) => (
                <button
                  key={role}
                  onClick={() => handleRoleLogin(role)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  ) : (
                    <span className="text-xl">{icon}</span>
                  )}
                  <span className="font-medium text-gray-700">Login as {USER_ROLE_LABELS[role]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="block font-medium mb-1">Default credentials:</span>
                <span className="block">admin@trakr.com, branchmanager@trakr.com, auditor@trakr.com</span>
                <span className="block font-medium mt-2">Password: Password@123</span>
                <span className="block text-amber-600 mt-2 text-xs">
                  If login fails, passwords may need to be set in Supabase Auth dashboard.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tagline */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-10">
        <p className="text-white/90 text-sm font-medium tracking-wide">
          LET'S MAKE THE WORLD MORE PRODUCTIVE, TOGETHER.
        </p>
      </div>
    </div>
  )
}

export default LoginScreen
