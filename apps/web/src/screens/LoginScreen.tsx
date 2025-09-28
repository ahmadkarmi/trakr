import React, { useState } from 'react'
import { UserRole, USER_ROLE_LABELS } from '@trakr/shared'
import { useAuthStore } from '../stores/auth'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'

const LoginScreen: React.FC = () => {
  const { signIn, signInWithCredentials, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const handleRoleLogin = async (role: UserRole) => {
    await signIn(role)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResetMessage(null)
    try {
      await signInWithCredentials(email, password)
    } catch (err: any) {
      const message = err?.message || 'Login failed'
      if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
        setError('Invalid credentials. Try the default password "Password123!" or use the demo role buttons below.')
      } else if (message.includes('User profile not found')) {
        setError('User account exists but profile not found in database. Please contact administrator.')
      } else {
        setError(message)
      }
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    if (!hasSupabaseEnv()) {
      setError('Password reset is not available (Supabase not configured). Please use the role buttons below.')
      return
    }

    setIsResetting(true)
    setError(null)
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
      setError(err?.message || 'Failed to send password reset email. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  const roleButtons = [
    { role: UserRole.AUDITOR, icon: '🕵️‍♂️' },
    { role: UserRole.BRANCH_MANAGER, icon: '🏬' },
    { role: UserRole.ADMIN, icon: '🛠️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-600 mb-2">Trakr</h1>
          <h2 className="text-lg sm:text-xl text-gray-600 font-medium">Modern Audit Management</h2>
        </div>

        {/* Supabase Auth (email/password) */}
        <form className="space-y-5" onSubmit={handlePasswordLogin}>
          <div className="text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-3 sm:py-3 rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base transition-colors"
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
          </div>
          <div className="text-left">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-3 sm:py-3 rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base transition-colors"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {resetMessage && <p className="text-sm text-green-600">{resetMessage}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 sm:py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          
          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors disabled:opacity-50"
              onClick={handleForgotPassword}
              disabled={isResetting}
            >
              {isResetting ? 'Sending reset email...' : 'Forgot your password?'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative pt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">or</span>
          </div>
        </div>

        {/* Quick Access Role Buttons */}
        <div className="space-y-4 pt-6">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 mb-2">Quick Access</div>
            <div className="text-xs text-gray-500">Choose your role to get started immediately</div>
          </div>
          <div className="space-y-3">
          {roleButtons.map(({ role, icon }) => (
            <button
              key={role}
              onClick={() => handleRoleLogin(role)}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 sm:py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              ) : (
                <span className="text-xl mr-3">{icon}</span>
              )}
              Login as {USER_ROLE_LABELS[role]}
            </button>
          ))}
          </div>
        </div>

        <div className="text-center px-2">
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Use your Supabase credentials to sign in.
            <br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0">
              <strong>Default accounts:</strong> admin@trakr.com, branchmanager@trakr.com, auditor@trakr.com
            </span>
            <br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0">
              <strong>Default password:</strong> Password123!
            </span>
            <br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0 text-amber-600">
              If login fails, passwords may need to be set in Supabase Auth dashboard.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
