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
      {/* Beautiful Multi-Color Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-500 to-purple-600">
        {/* Enhanced Organic Shapes for Depth */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-r from-teal-400/25 to-purple-400/25 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/15 to-teal-400/15 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-gradient-to-r from-purple-300/20 to-blue-300/20 rounded-full blur-2xl"></div>
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center p-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-teal-400 to-purple-500 rounded-xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20">
            <span className="text-2xl font-bold text-white drop-shadow-lg">T</span>
          </div>
          <span className="text-white font-bold text-2xl tracking-wide drop-shadow-lg">Trakr</span>
        </div>
      </div>

      {/* Main Login Card - Glass Effect Two Column Layout */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5 rounded-2xl"></div>
          <div className="relative grid lg:grid-cols-2 min-h-[600px]">
            
            {/* Left Column - Login Form */}
            <div className="relative p-8 flex flex-col justify-center">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Welcome back!</h1>
                <p className="text-white/80">Sign in to continue to Trakr</p>
              </div>

              {/* Email/Password Login Form */}
              <form onSubmit={handlePasswordLogin} className="space-y-4 mb-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-white placeholder-white/60"
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-white/90">Password</label>
                    <button
                      type="button"
                      className="text-sm text-white/80 hover:text-white font-medium transition-colors disabled:opacity-50"
                      onClick={handleForgotPassword}
                      disabled={isResetting}
                    >
                      {isResetting ? 'Sending...' : 'Forgot?'}
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-white placeholder-white/60"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {appError && (
                  <div className="p-3 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg">
                    <p className="text-sm text-red-100">{appError.userMessage}</p>
                  </div>
                )}
                
                {resetMessage && (
                  <div className="p-3 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-lg">
                    <p className="text-sm text-green-100">{resetMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-purple-600 hover:from-blue-700 hover:via-teal-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 shadow-xl backdrop-blur-sm"
                >
                  {isLoading ? 'Signing in...' : 'Log in'}
                </button>
              </form>

              {/* Signup Link */}
              <div className="text-center text-sm text-white/80">
                Don't have an account? <span className="text-white font-medium cursor-pointer hover:underline">Sign up</span>
              </div>
            </div>

            {/* Right Column - Quick Access & Help */}
            <div className="relative bg-white/5 backdrop-blur-sm p-8 flex flex-col justify-center lg:block hidden border-l border-white/20">
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 drop-shadow-lg">Quick Access</h3>
                <p className="text-sm text-white/80 mb-4">Choose your role to get started immediately</p>
                <div className="space-y-3">
                  {roleButtons.map(({ role, icon }) => (
                    <button
                      key={role}
                      onClick={() => handleRoleLogin(role)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 py-3 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <span className="text-lg">{icon}</span>
                      )}
                      <span className="font-medium text-white">Login as {USER_ROLE_LABELS[role]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                <p className="text-xs text-white/90 leading-relaxed">
                  <span className="block font-medium mb-2 text-white">Default credentials:</span>
                  <span className="block mb-1">admin@trakr.com</span>
                  <span className="block mb-1">branchmanager@trakr.com</span>
                  <span className="block mb-2">auditor@trakr.com</span>
                  <span className="block font-medium mb-1 text-white">Password: Password@123</span>
                  <span className="block text-yellow-200 text-xs">
                    If login fails, passwords may need to be set in Supabase Auth dashboard.
                  </span>
                </p>
              </div>
            </div>

            {/* Mobile Quick Access - Below Form */}
            <div className="lg:hidden p-8 pt-0 relative">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white/10 backdrop-blur-sm text-sm text-white/80 rounded-full">or</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {roleButtons.map(({ role, icon }) => (
                  <button
                    key={role}
                    onClick={() => handleRoleLogin(role)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <span className="text-lg">{icon}</span>
                    )}
                    <span className="font-medium text-white">Login as {USER_ROLE_LABELS[role]}</span>
                  </button>
                ))}
              </div>

              {/* Mobile Help Text */}
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                <p className="text-xs text-white/90 leading-relaxed text-center">
                  <span className="block font-medium mb-1 text-white">Default credentials available</span>
                  <span className="block">Password: Password@123</span>
                </p>
              </div>
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
