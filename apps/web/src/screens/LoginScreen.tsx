import React, { useState, useEffect, useRef } from 'react'
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
  
  // Parallax effect state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [gyroPos, setGyroPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Mouse movement tracking for desktop parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const x = (e.clientX - rect.left - centerX) / centerX
        const y = (e.clientY - rect.top - centerY) / centerY
        setMousePos({ x: x * 50, y: y * 50 }) // Scale movement
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Gyroscope tracking for mobile parallax
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        // Beta is front-to-back tilt (-180 to 180)
        // Gamma is left-to-right tilt (-90 to 90)
        const x = Math.max(-30, Math.min(30, e.gamma)) / 30 * 50
        const y = Math.max(-30, Math.min(30, e.beta - 90)) / 30 * 50
        setGyroPos({ x, y })
      }
    }

    // Request permission for iOS devices
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission()
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation)
          }
        } catch (error) {
          console.log('Device orientation permission denied')
        }
      } else {
        // For non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    requestPermission()
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  const roleButtons = [
    { role: UserRole.ADMIN, icon: '🛠️' },
    { role: UserRole.BRANCH_MANAGER, icon: '🏬' },
    { role: UserRole.AUDITOR, icon: '🕵️‍♂️' },
  ]

  // Calculate parallax offset (use gyroscope on mobile, mouse on desktop)
  const parallaxX = window.innerWidth <= 768 ? gyroPos.x : mousePos.x
  const parallaxY = window.innerWidth <= 768 ? gyroPos.y : mousePos.y

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden flex items-center justify-center py-8">
      {/* Space Effect Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Interactive Parallax Stars */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Layer 1 - Closest Stars (strongest parallax) */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${parallaxX * 0.8}px, ${parallaxY * 0.8}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-lg shadow-white/50"></div>
            <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-75 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-150 shadow-lg shadow-cyan-200/50"></div>
            <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-300 shadow-lg shadow-white/50"></div>
          </div>

          {/* Layer 2 - Medium Distance Stars */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)`,
              transition: 'transform 0.15s ease-out'
            }}
          >
            <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-3/4 right-1/6 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-700"></div>
            <div className="absolute top-1/5 left-1/2 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-200"></div>
            <div className="absolute top-2/3 left-1/5 w-1 h-1 bg-white rounded-full animate-pulse delay-400"></div>
            <div className="absolute bottom-1/5 right-1/2 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-600"></div>
            <div className="absolute top-1/8 right-2/3 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-800"></div>
          </div>

          {/* Layer 3 - Distant Stars (subtle parallax) */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${parallaxX * 0.2}px, ${parallaxY * 0.2}px)`,
              transition: 'transform 0.2s ease-out'
            }}
          >
            <div className="absolute top-1/6 right-1/5 w-0.5 h-0.5 bg-white rounded-full animate-ping"></div>
            <div className="absolute top-3/5 left-1/8 w-0.5 h-0.5 bg-blue-200 rounded-full animate-ping delay-1000"></div>
            <div className="absolute bottom-1/6 left-3/5 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-ping delay-2000"></div>
            <div className="absolute top-4/5 right-1/8 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-1500"></div>
            <div className="absolute top-1/10 left-4/5 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse delay-900"></div>
            <div className="absolute bottom-2/5 right-3/4 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse delay-1200"></div>
          </div>

          {/* Layer 4 - Background Twinkles */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${parallaxX * 0.1}px, ${parallaxY * 0.1}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          >
            <div className="absolute top-1/12 left-1/12 w-px h-px bg-white rounded-full animate-ping delay-3000"></div>
            <div className="absolute top-5/6 right-1/12 w-px h-px bg-blue-200 rounded-full animate-ping delay-4000"></div>
            <div className="absolute top-1/2 left-5/6 w-px h-px bg-cyan-100 rounded-full animate-ping delay-5000"></div>
            <div className="absolute bottom-1/12 left-1/2 w-px h-px bg-white rounded-full animate-ping delay-6000"></div>
          </div>
        </div>
        
        {/* Nebula Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-r from-indigo-600/15 to-purple-600/15 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-600/8 to-indigo-600/8 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-gradient-to-r from-purple-500/12 to-blue-500/12 rounded-full blur-2xl"></div>
        
        {/* Distant Galaxy Effect */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-radial from-blue-400/5 to-transparent rounded-full blur-xl"></div>
      </div>

      {/* Main Login Card - Glass Effect with Logo Inside */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5 rounded-2xl"></div>
          
          {/* Mobile Logo Header */}
          <div className="relative p-6 text-center border-b border-white/20 lg:hidden">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl">
                <span className="text-xl font-bold text-primary-600 drop-shadow-sm">T</span>
              </div>
              <span className="text-white font-bold text-2xl tracking-wide drop-shadow-lg">Trakr</span>
            </div>
          </div>

          <div className="relative grid lg:grid-cols-2 min-h-[500px]">
            
            {/* Left Column - Login Form */}
            <div className="relative p-8 flex flex-col justify-center">
              {/* Desktop Logo - Above Welcome Back */}
              <div className="hidden lg:flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-xl">
                  <span className="text-2xl font-bold text-primary-600 drop-shadow-sm">T</span>
                </div>
                <span className="text-white font-bold text-3xl tracking-wide drop-shadow-lg">Trakr</span>
              </div>

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
                  className="w-full bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 shadow-xl"
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

            {/* Mobile Quick Access - Full Information */}
            <div className="lg:hidden relative">
              <div className="p-8 pt-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/30" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white/10 backdrop-blur-sm text-sm text-white/80 rounded-full">or</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 text-center drop-shadow-lg">Quick Access</h3>
                  <p className="text-sm text-white/80 mb-4 text-center">Choose your role to get started immediately</p>
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

                {/* Mobile Help Text - Full Information */}
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                  <p className="text-xs text-white/90 leading-relaxed">
                    <span className="block font-medium mb-2 text-white text-center">Default credentials:</span>
                    <span className="block mb-1 text-center">admin@trakr.com</span>
                    <span className="block mb-1 text-center">branchmanager@trakr.com</span>
                    <span className="block mb-2 text-center">auditor@trakr.com</span>
                    <span className="block font-medium mb-1 text-white text-center">Password: Password@123</span>
                    <span className="block text-yellow-200 text-xs text-center mt-2">
                      If login fails, passwords may need to be set in Supabase Auth dashboard.
                    </span>
                  </p>
                </div>
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
