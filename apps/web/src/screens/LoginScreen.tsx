import React, { useState } from 'react'
import { UserRole, USER_ROLE_LABELS } from '@trakr/shared'
import { useAuthStore } from '../stores/auth'

const LoginScreen: React.FC = () => {
  const { signIn, signInWithCredentials, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleRoleLogin = async (role: UserRole) => {
    await signIn(role)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await signInWithCredentials(email, password)
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    }
  }

  const roleButtons = [
    { role: UserRole.AUDITOR, icon: '🕵️‍♂️' },
    { role: UserRole.BRANCH_MANAGER, icon: '🏬' },
    { role: UserRole.ADMIN, icon: '🛠️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Trakr</h1>
          <h2 className="text-xl text-gray-600 font-medium">Modern Audit Management</h2>
        </div>

        {/* Supabase Auth (email/password) */}
        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <div className="text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Demo role buttons (fallback) */}
        <div className="space-y-2 pt-6">
          <div className="text-center text-xs text-gray-500">or continue with demo roles</div>
          <div className="space-y-4">
          {roleButtons.map(({ role, icon }) => (
            <button
              key={role}
              onClick={() => handleRoleLogin(role)}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Use your Supabase credentials to sign in.
            If you do not have a password set for the seeded users, set one in Supabase Auth: admin@trakr.com, branchmanager@trakr.com, auditor@trakr.com.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
