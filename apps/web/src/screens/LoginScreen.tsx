import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { UserRole } from '@trakr/shared'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'
import { api } from '../utils/api'
import { logger } from '../utils/logger'
import { safeLocalStorage } from '../utils/safeStorage'

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password'
type AuthStatus = 'idle' | 'submitting' | 'success' | 'error'
type ErrorType = 
  | null
  | 'invalid_credentials'
  | 'account_not_found'
  | 'email_already_exists'
  | 'weak_password'
  | 'invalid_email'
  | 'network_error'
  | 'server_error'
  | 'rate_limited'
  | 'validation_error'
  | 'unknown_error'

interface AuthError {
  type: ErrorType
  title: string
  message: string
  action?: string
}

interface SuccessMessage {
  title: string
  message: string
}

const LoginScreen: React.FC = () => {
  // Form state
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('') // For registration form
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0)
  
  // Status state
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const [successMessage, setSuccessMessage] = useState<SuccessMessage | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockUntil, setLockUntil] = useState<Date | null>(null)
  
  const formRef = useRef<HTMLFormElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  
  const navigate = useNavigate()
  const { signIn } = useAuthStore()

  // Switch between auth modes
  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setAuthError(null)
    setSuccessMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  // Auto-focus email field on mount
  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  // Lockout countdown timer
  useEffect(() => {
    if (lockUntil && lockUntil > new Date()) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockUntil.getTime() - new Date().getTime()) / 1000)
        if (remaining <= 0) {
          setIsLocked(false)
          setLockUntil(null)
          setFailedAttempts(0)
          setLockoutSecondsRemaining(0)
        } else {
          setLockoutSecondsRemaining(remaining)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [lockUntil])

  // Parse Supabase error to user-friendly message
  const parseSupabaseError = (err: any): AuthError => {
    const errorMessage = err?.message || err?.error_description || ''
    const errorCode = err?.code || err?.status

    // Invalid credentials
    if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid email or password')) {
      return {
        type: 'invalid_credentials',
        title: 'Invalid credentials',
        message: 'The email or password you entered is incorrect.',
        action: 'Please check your credentials and try again'
      }
    }

    // Email not found
    if (errorMessage.includes('User not found') || errorMessage.includes('Email not found')) {
      return {
        type: 'account_not_found',
        title: 'Account not found',
        message: 'No account exists with this email address.',
        action: 'Check your email or contact your administrator'
      }
    }

    // Network errors
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network') || !navigator.onLine) {
      return {
        type: 'network_error',
        title: 'Connection error',
        message: 'Unable to connect. Check your internet connection.',
        action: 'Retry'
      }
    }

    // Server errors
    if (errorCode === 500 || errorCode >= 500) {
      return {
        type: 'server_error',
        title: 'Server error',
        message: 'Something went wrong on our end. Please try again.',
        action: 'Retry'
      }
    }

    // Rate limiting
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return {
        type: 'rate_limited',
        title: 'Too many requests',
        message: 'You\'re trying too frequently. Please wait a moment.',
        action: 'Wait 30 seconds'
      }
    }

    // Email already exists (registration)
    if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      return {
        type: 'email_already_exists',
        title: 'Email already registered',
        message: 'An account with this email already exists.',
        action: 'Try logging in instead'
      }
    }

    // Weak password
    if (errorMessage.includes('Password') && (errorMessage.includes('weak') || errorMessage.includes('short'))) {
      return {
        type: 'weak_password',
        title: 'Password too weak',
        message: 'Password must be at least 8 characters with letters and numbers.',
        action: 'Choose a stronger password'
      }
    }

    // Invalid email format
    if (errorMessage.includes('Invalid email') || errorMessage.includes('email format')) {
      return {
        type: 'invalid_email',
        title: 'Invalid email',
        message: 'Please enter a valid email address.',
        action: 'Check your email format'
      }
    }

    // Unknown error
    return {
      type: 'unknown_error',
      title: authMode === 'register' ? 'Registration failed' : 'Authentication failed',
      message: errorMessage || 'An unexpected error occurred. Please try again.',
      action: 'Please try again'
    }
  }

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if account is locked
    if (isLocked && lockUntil) {
      const secondsRemaining = Math.ceil((lockUntil.getTime() - new Date().getTime()) / 1000)
      setAuthError({
        type: 'rate_limited',
        title: 'Account temporarily locked',
        message: `Too many failed attempts. Try again in ${secondsRemaining} seconds.`,
        action: 'Please wait before trying again'
      })
      return
    }

    // Validation
    if (!email || !password) {
      setAuthError({
        type: 'validation_error',
        title: 'Missing information',
        message: 'Please enter both email and password.',
        action: undefined
      })
      return
    }

    setAuthStatus('submitting')
    setAuthError(null)
    setSuccessMessage(null)
    
    try {
      // Call Supabase directly to avoid auth store re-render issues
      if (!hasSupabaseEnv()) {
        throw new Error('Supabase auth is not configured')
      }
      const supabase = getSupabase()
      
      // Set session persistence based on "Remember Me" checkbox
      if (rememberMe) {
        logger.info('Remember me enabled - session will persist for 30 days', { context: 'LoginScreen' })
        // Store preference for extended session (Supabase handles this via local storage)
        safeLocalStorage.setItem('trakr_remember_me', 'true')
      } else {
        safeLocalStorage.removeItem('trakr_remember_me')
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('No user returned')
      
      // Fetch user from database and update auth store
      const authUser = data.user
      let appUser = null
      
      // Use the api utility with parallel lookup for speed
      try {
        const [userById, allUsers] = await Promise.allSettled([
          api.getUserById(authUser.id),
          api.getUsers()
        ])
        
        if (userById.status === 'fulfilled' && userById.value) {
          appUser = userById.value
        } else if (allUsers.status === 'fulfilled' && allUsers.value) {
          appUser = allUsers.value.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        }
      } catch (apiError) {
        logger.warn('Parallel lookup failed, trying sequential', { context: 'LoginScreen', data: apiError })
        // Fallback to sequential lookup
        try {
          appUser = await api.getUserById(authUser.id)
        } catch {
          const users = await api.getUsers()
          appUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        }
      }
      
      if (!appUser) {
        throw new Error('User profile not found in database. Please ensure the database is seeded.')
      }
      
      // Update auth store manually to trigger navigation
      useAuthStore.setState({ user: appUser, isAuthenticated: true, isLoading: false })
      
      // Success! Reset failed attempts
      setFailedAttempts(0)
      setAuthStatus('success')
      setAuthError(null)
      
    } catch (err: any) {
      // Auto-provision fallback: if using default password and user exists in DB but not in Auth, create the Auth user
      try {
        const defaultPassword = (import.meta as any).env?.VITE_DEFAULT_PASSWORD || 'Password@123'
        if (password === defaultPassword) {
          // Check if this email exists in application DB (public.users)
          let existsInDb = false
          try {
            const users = await api.getUsers()
            existsInDb = !!users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase())
          } catch (lookupErr) {
            logger.warn('User DB lookup failed during auto-provision', { context: 'LoginScreen', data: lookupErr })
          }
          if (existsInDb) {
            const supabase = getSupabase()
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: defaultPassword })
            if (!signUpError) {
              // If email confirmation is required, no session will be created
              if (!signUpData.session || !signUpData.user) {
                setSuccessMessage({
                  title: 'Confirm your email',
                  message: `We created your account. Please check ${email} to verify your email, then log in with your password.`
                })
                setAuthStatus('success')
                return
              }
              // Session exists – proceed like normal login
              const authUser = signUpData.user
              // Fetch user from database and update auth store
              let appUser: any = null
              try {
                const [userById, allUsers] = await Promise.allSettled([
                  api.getUserById(authUser.id),
                  api.getUsers()
                ])
                if (userById.status === 'fulfilled' && userById.value) {
                  appUser = userById.value
                } else if (allUsers.status === 'fulfilled' && allUsers.value) {
                  appUser = allUsers.value.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase())
                }
              } catch (apiError) {
                logger.warn('Parallel lookup failed, trying sequential', { context: 'LoginScreen', data: apiError })
                try {
                  appUser = await api.getUserById(authUser.id)
                } catch {
                  const users = await api.getUsers()
                  appUser = users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase())
                }
              }
              if (!appUser) {
                throw new Error('User profile not found in database. Please ensure the database is seeded.')
              }
              // Update auth store and exit
              useAuthStore.setState({ user: appUser, isAuthenticated: true, isLoading: false })
              setFailedAttempts(0)
              setAuthStatus('success')
              setAuthError(null)
              return
            }
          }
        }
      } catch (autoProvErr) {
        logger.warn('Auto-provision login fallback failed', { context: 'LoginScreen', data: autoProvErr })
      }

      // Parse and set error
      const parsedError = parseSupabaseError(err)
      setAuthError(parsedError)
      setAuthStatus('error')
      
      // Track failed attempts
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      
      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        const lockDuration = 15 * 60 * 1000 // 15 minutes
        const until = new Date(Date.now() + lockDuration)
        setIsLocked(true)
        setLockUntil(until)
        setAuthError({
          type: 'rate_limited',
          title: 'Account locked',
          message: 'Too many failed login attempts. Account locked for 15 minutes.',
          action: 'Please wait before trying again'
        })
      }
      
      // Shake animation
      if (formRef.current) {
        formRef.current.classList.add('animate-shake')
        setTimeout(() => {
          formRef.current?.classList.remove('animate-shake')
        }, 500)
      }
    }
  }

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!email || !password || !fullName) {
      setAuthError({
        type: 'validation_error',
        title: 'Missing information',
        message: 'Please fill in all required fields.',
        action: undefined
      })
      return
    }

    if (password !== confirmPassword) {
      setAuthError({
        type: 'validation_error',
        title: 'Passwords don\'t match',
        message: 'Please make sure both passwords are identical.',
        action: undefined
      })
      return
    }

    if (password.length < 8) {
      setAuthError({
        type: 'weak_password',
        title: 'Password too short',
        message: 'Password must be at least 8 characters long.',
        action: 'Choose a longer password'
      })
      return
    }

    setAuthStatus('submitting')
    setAuthError(null)

    try {
      if (!hasSupabaseEnv()) {
        throw new Error('Authentication service not configured')
      }

      const supabase = getSupabase()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (error) throw error

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccessMessage({
          title: 'Check your email',
          message: `We've sent a confirmation link to ${email}. Please verify your email to complete registration.`
        })
        setAuthStatus('success')
      } else {
        setSuccessMessage({
          title: 'Account created!',
          message: 'Your account has been created successfully. Redirecting...'
        })
        setAuthStatus('success')
        // Redirect will happen automatically via auth state change
      }
    } catch (err: any) {
      const parsedError = parseSupabaseError(err)
      setAuthError(parsedError)
      setAuthStatus('error')
      
      if (formRef.current) {
        formRef.current.classList.add('animate-shake')
        setTimeout(() => formRef.current?.classList.remove('animate-shake'), 500)
      }
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setAuthError({
        type: 'validation_error',
        title: 'Email required',
        message: 'Please enter your email address to reset your password.',
        action: undefined
      })
      return
    }

    if (!hasSupabaseEnv()) {
      setAuthError({
        type: 'server_error',
        title: 'Service unavailable',
        message: 'Password reset is currently unavailable.',
        action: 'Please try again later'
      })
      return
    }

    setAuthStatus('submitting')
    setAuthError(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?mode=reset-password`,
      })

      if (error) throw error

      setSuccessMessage({
        title: 'Check your email',
        message: `We've sent password reset instructions to ${email}. Please check your inbox.`
      })
      setAuthStatus('success')
    } catch (err: any) {
      const parsedError = parseSupabaseError(err)
      setAuthError(parsedError)
      setAuthStatus('error')
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
        {/* Left Column - Login Form */}
        <div className="flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-gray-50 h-full overflow-y-auto">
          <div className="w-full max-w-sm lg:max-w-md">
            {/* Logo */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  T
                </div>
                <span className="text-2xl font-semibold tracking-tight text-gray-900">Trakr</span>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                {authMode === 'login' && 'Log in to your Account'}
                {authMode === 'register' && 'Create your Account'}
                {authMode === 'forgot-password' && 'Reset your Password'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {authMode === 'login' && 'Welcome back! Select method to log in:'}
                {authMode === 'register' && 'Get started with Trakr today'}
                {authMode === 'forgot-password' && 'Enter your email to receive a reset link'}
              </p>
            </div>

            {/* Dev quick access buttons - where social login would be */}
            {(import.meta.env.DEV || window.location.hostname === 'localhost') && authMode === 'login' && (
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signIn(UserRole.ADMIN)
                        navigate('/dashboard/admin')
                      } catch (e) {
                        logger.error('Quick login failed', e, { context: 'LoginScreen' })
                      }
                    }}
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signIn(UserRole.BRANCH_MANAGER)
                        navigate('/dashboard/branch-manager')
                      } catch (e) {
                        logger.error('Quick login failed', e, { context: 'LoginScreen' })
                      }
                    }}
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Branch Manager
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signIn(UserRole.AUDITOR)
                        navigate('/dashboard/auditor')
                      } catch (e) {
                        logger.error('Quick login failed', e, { context: 'LoginScreen' })
                      }
                    }}
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Auditor
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or continue with email</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault()
                if (authStatus === 'submitting' || isLocked) return
                if (authMode === 'login') {
                  void handleLogin(e)
                } else if (authMode === 'register') {
                  void handleRegister(e)
                } else {
                  void handleForgotPassword(e)
                }
              }}
              className="mt-8 space-y-6"
            >
              {/* Full Name - Register only */}
              {authMode === 'register' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="Jane Smith"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password - Login & Register */}
              {authMode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {authMode === 'register' && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Must be 8+ characters with uppercase, lowercase, and numbers
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password - Register only */}
              {authMode === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
              {authError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">{authError.title}</p>
                      <p className="mt-1 text-sm text-red-700">
                        {isLocked && lockoutSecondsRemaining > 0
                          ? `Account locked for ${Math.floor(lockoutSecondsRemaining / 60)}:${String(lockoutSecondsRemaining % 60).padStart(2, '0')}. Please wait or reset your password.`
                          : authError.message}
                      </p>
                      {authError.action && !isLocked && (
                        <p className="mt-1 text-sm text-red-700">{authError.action}</p>
                      )}
                      {isLocked && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot-password')}
                          className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
                        >
                          Reset password
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success message */}
              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">{successMessage.title}</p>
                      <p className="mt-1 text-sm text-green-700">{successMessage.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Remember me toggle - Login only */}
              {authMode === 'login' && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">Remember me for 30 days</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      rememberMe ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        rememberMe ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={authStatus === 'submitting' || isLocked}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {authStatus === 'submitting' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>
                      {authMode === 'login' ? 'Signing in...' : authMode === 'register' ? 'Creating account...' : 'Sending...'}
                    </span>
                  </>
                ) : isLocked ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Account locked</span>
                  </>
                ) : (
                  authMode === 'login' ? 'Sign in' : authMode === 'register' ? 'Create account' : 'Send reset link'
                )}
              </button>
            </form>

            {/* Mode switching links */}
            <div className="mt-6 text-sm">
              {authMode === 'login' ? (
                <div className="space-y-3">
                  <div className="text-gray-600">
                    Don't have an account?{' '}
                    <button
                      onClick={() => switchMode('register')}
                      className="text-primary-600 hover:text-primary-700 font-semibold"
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => switchMode('forgot-password')}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              ) : authMode === 'register' ? (
                <div className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                    type="button"
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => switchMode('login')}
                  className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Brand Panel (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-center items-center relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 h-full p-8 lg:p-10 xl:p-12 shadow-2xl">
          <div className="w-full max-w-lg">
            {/* Feature Showcase */}
            <div className="space-y-8">
              <div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3.5 leading-tight">
                  Audit and Compliance Software for Multi-Site Teams
                </h3>
                <p className="text-white/90 text-sm lg:text-base leading-relaxed">
                  Run mobile audits, document critical issues, and track corrective actions in one place.
                </p>
              </div>

              {/* How Trakr Works Steps - Condensed */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm text-white font-bold text-xs border border-white/40">
                      1
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1.5 text-sm">Configure Templates</h4>
                    <p className="text-white/80 text-xs leading-relaxed">
                      Build checklists with sections, weights, and critical items.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm text-white font-bold text-xs border border-white/40">
                      2
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1.5 text-sm">Run Audits On Site</h4>
                    <p className="text-white/80 text-xs leading-relaxed">
                      Complete audits faster with photos, notes, and offline support.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm text-white font-bold text-xs border border-white/40">
                      3
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1.5 text-sm">Score & Report</h4>
                    <p className="text-white/80 text-xs leading-relaxed">
                      Instant weighted scores with section breakdowns and trends.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm text-white font-bold text-xs border border-white/40">
                      4
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1.5 text-sm">Approve Reviews</h4>
                    <p className="text-white/80 text-xs leading-relaxed">
                      Manager sign off with signatures to create accountability.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm text-white font-bold text-xs border border-white/40">
                      5
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1.5 text-sm">Track History</h4>
                    <p className="text-white/80 text-xs leading-relaxed">
                      Complete timeline to prove compliance over time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom tagline */}
              <div className="pt-7 border-t border-white/30">
                <p className="text-white text-xs font-medium">
                  Streamline audits. Empower teams. Drive excellence.
                </p>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -ml-24 -mb-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
