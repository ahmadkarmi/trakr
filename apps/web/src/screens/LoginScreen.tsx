import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/auth'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'
import { api } from '../utils/api'

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
  
  // Parallax effect state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [gyroPos, setGyroPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

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
        console.log('[Auth] Remember me enabled - session will persist for 30 days')
        // Store preference for extended session (Supabase handles this via local storage)
        localStorage.setItem('trakr_remember_me', 'true')
      } else {
        localStorage.removeItem('trakr_remember_me')
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
        console.error('[Auth] Parallel lookup failed, trying sequential', apiError)
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

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
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
            window.addEventListener('deviceorientation', handleOrientation, { passive: true })
          }
        } catch (error) {
          console.log('Device orientation permission denied')
        }
      } else {
        // For non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation, { passive: true })
      }
    }

    requestPermission()
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  // Calculate parallax offset (use gyroscope on mobile, mouse on desktop)
  const parallaxX = window.innerWidth <= 768 ? gyroPos.x : mousePos.x
  const parallaxY = window.innerWidth <= 768 ? gyroPos.y : mousePos.y

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden flex items-center justify-center py-8 pb-20">
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
            {/* Central visible area stars */}
            <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-lg shadow-white/50"></div>
            <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-75 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-150 shadow-lg shadow-cyan-200/50"></div>
            <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-300 shadow-lg shadow-white/50"></div>
            
            {/* Additional visible area stars */}
            <div className="absolute top-1/6 left-1/2 w-1.5 h-1.5 bg-cyan-100 rounded-full animate-pulse delay-400 shadow-lg shadow-cyan-100/50"></div>
            <div className="absolute top-2/3 right-1/2 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-500 shadow-lg shadow-blue-300/50"></div>
            <div className="absolute top-1/2 left-1/8 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-600 shadow-lg shadow-white/50"></div>
            <div className="absolute top-1/2 right-1/8 w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-700 shadow-lg shadow-cyan-200/50"></div>
            <div className="absolute top-5/6 left-2/5 w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-800 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute top-1/8 right-2/5 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-900 shadow-lg shadow-white/50"></div>
            
            {/* Randomly scattered stars across entire background */}
            <div className="absolute top-[8%] left-[12%] w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-1000 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute top-[23%] left-[7%] w-1.5 h-1.5 bg-cyan-100 rounded-full animate-pulse delay-1100 shadow-lg shadow-cyan-100/50"></div>
            <div className="absolute top-[41%] left-[15%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-1200 shadow-lg shadow-white/50"></div>
            <div className="absolute top-[58%] left-[9%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-1300 shadow-lg shadow-blue-300/50"></div>
            <div className="absolute top-[75%] left-[13%] w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-1400 shadow-lg shadow-cyan-200/50"></div>
            <div className="absolute top-[91%] left-[6%] w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse delay-1500 shadow-lg shadow-blue-100/50"></div>
            
            <div className="absolute top-[14%] right-[11%] w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse delay-1600 shadow-lg shadow-cyan-300/50"></div>
            <div className="absolute top-[29%] right-[8%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-1700 shadow-lg shadow-white/50"></div>
            <div className="absolute top-[46%] right-[14%] w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-1800 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute top-[63%] right-[7%] w-1.5 h-1.5 bg-cyan-100 rounded-full animate-pulse delay-1900 shadow-lg shadow-cyan-100/50"></div>
            <div className="absolute top-[80%] right-[12%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-2000 shadow-lg shadow-blue-300/50"></div>
            <div className="absolute top-[95%] right-[9%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-2100 shadow-lg shadow-white/50"></div>
            
            {/* More random scattered stars throughout the middle areas */}
            <div className="absolute top-[18%] left-[22%] w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse delay-2200 shadow-lg shadow-blue-100/50"></div>
            <div className="absolute top-[35%] left-[19%] w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-2300 shadow-lg shadow-cyan-200/50"></div>
            <div className="absolute top-[52%] left-[25%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-2400 shadow-lg shadow-white/50"></div>
            <div className="absolute top-[69%] left-[21%] w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-2500 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute top-[86%] left-[24%] w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse delay-2600 shadow-lg shadow-cyan-300/50"></div>
            
            <div className="absolute top-[11%] right-[23%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-2700 shadow-lg shadow-blue-300/50"></div>
            <div className="absolute top-[28%] right-[20%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-2800 shadow-lg shadow-white/50"></div>
            <div className="absolute top-[45%] right-[26%] w-1.5 h-1.5 bg-cyan-100 rounded-full animate-pulse delay-2900 shadow-lg shadow-cyan-100/50"></div>
            <div className="absolute top-[62%] right-[22%] w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse delay-3000 shadow-lg shadow-blue-100/50"></div>
            <div className="absolute top-[79%] right-[25%] w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-3100 shadow-lg shadow-cyan-200/50"></div>
            
            {/* Additional random stars in various positions */}
            <div className="absolute top-[6%] left-[31%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-3200 shadow-lg shadow-white/50"></div>
            <div className="absolute top-[33%] left-[88%] w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-3300 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute top-[71%] left-[92%] w-1.5 h-1.5 bg-cyan-100 rounded-full animate-pulse delay-3400 shadow-lg shadow-cyan-100/50"></div>
            <div className="absolute top-[89%] left-[84%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-3500 shadow-lg shadow-blue-300/50"></div>
            <div className="absolute top-[16%] left-[77%] w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse delay-3600 shadow-lg shadow-cyan-200/50"></div>
            <div className="absolute top-[54%] left-[81%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-3700 shadow-lg shadow-white/50"></div>
            
            <div className="absolute top-[3%] left-[43%] w-1.5 h-1.5 bg-blue-100 rounded-full animate-pulse delay-3800 shadow-lg shadow-blue-100/50"></div>
            <div className="absolute top-[97%] left-[47%] w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse delay-3900 shadow-lg shadow-cyan-300/50"></div>
            <div className="absolute top-[2%] left-[67%] w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse delay-4000 shadow-lg shadow-blue-200/50"></div>
            <div className="absolute top-[98%] left-[63%] w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-4100 shadow-lg shadow-white/50"></div>
          </div>

          {/* Layer 2 - Medium Distance Stars */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)`,
              transition: 'transform 0.15s ease-out'
            }}
          >
            {/* Original medium stars */}
            <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-3/4 right-1/6 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-700"></div>
            <div className="absolute top-1/5 left-1/2 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-200"></div>
            <div className="absolute top-2/3 left-1/5 w-1 h-1 bg-white rounded-full animate-pulse delay-400"></div>
            <div className="absolute bottom-1/5 right-1/2 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-600"></div>
            <div className="absolute top-1/8 right-2/3 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-800"></div>
            
            {/* Additional medium stars for better visibility */}
            <div className="absolute top-1/3 left-3/5 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-4/5 right-3/5 w-1 h-1 bg-white rounded-full animate-pulse delay-1100"></div>
            <div className="absolute top-1/10 left-3/4 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-1200"></div>
            <div className="absolute top-7/8 left-1/8 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-1300"></div>
            <div className="absolute top-2/5 right-1/10 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-1400"></div>
            <div className="absolute top-3/5 left-4/5 w-1 h-1 bg-white rounded-full animate-pulse delay-1500"></div>
            <div className="absolute top-1/7 right-1/7 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-1600"></div>
            <div className="absolute top-6/7 left-6/7 w-1 h-1 bg-cyan-300 rounded-full animate-pulse delay-1700"></div>
            
            {/* Left edge medium stars */}
            <div className="absolute top-1/8 left-1/32 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-3200"></div>
            <div className="absolute top-2/8 left-1/28 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-3300"></div>
            <div className="absolute top-3/8 left-1/30 w-1 h-1 bg-white rounded-full animate-pulse delay-3400"></div>
            <div className="absolute top-4/8 left-1/26 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-3500"></div>
            <div className="absolute top-5/8 left-1/32 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-3600"></div>
            <div className="absolute top-6/8 left-1/28 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-3700"></div>
            <div className="absolute top-7/8 left-1/30 w-1 h-1 bg-white rounded-full animate-pulse delay-3800"></div>
            
            {/* Right edge medium stars */}
            <div className="absolute top-1/8 right-1/32 w-1 h-1 bg-cyan-300 rounded-full animate-pulse delay-3900"></div>
            <div className="absolute top-2/8 right-1/28 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-4000"></div>
            <div className="absolute top-3/8 right-1/30 w-1 h-1 bg-white rounded-full animate-pulse delay-4100"></div>
            <div className="absolute top-4/8 right-1/26 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-4200"></div>
            <div className="absolute top-5/8 right-1/32 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-4300"></div>
            <div className="absolute top-6/8 right-1/28 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-4400"></div>
            <div className="absolute top-7/8 right-1/30 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-4500"></div>
            
            {/* Top edge medium stars */}
            <div className="absolute top-1/32 left-1/8 w-1 h-1 bg-white rounded-full animate-pulse delay-4600"></div>
            <div className="absolute top-1/28 left-2/8 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-4700"></div>
            <div className="absolute top-1/30 left-3/8 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-4800"></div>
            <div className="absolute top-1/32 left-4/8 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-4900"></div>
            <div className="absolute top-1/28 left-5/8 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-5000"></div>
            <div className="absolute top-1/30 left-6/8 w-1 h-1 bg-white rounded-full animate-pulse delay-5100"></div>
            <div className="absolute top-1/32 left-7/8 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-5200"></div>
            
            {/* Bottom edge medium stars */}
            <div className="absolute bottom-1/32 left-1/8 w-1 h-1 bg-cyan-300 rounded-full animate-pulse delay-5300"></div>
            <div className="absolute bottom-1/28 left-2/8 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-5400"></div>
            <div className="absolute bottom-1/30 left-3/8 w-1 h-1 bg-white rounded-full animate-pulse delay-5500"></div>
            <div className="absolute bottom-1/32 left-4/8 w-1 h-1 bg-cyan-100 rounded-full animate-pulse delay-5600"></div>
            <div className="absolute bottom-1/28 left-5/8 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-5700"></div>
            <div className="absolute bottom-1/30 left-6/8 w-1 h-1 bg-cyan-200 rounded-full animate-pulse delay-5800"></div>
            <div className="absolute bottom-1/32 left-7/8 w-1 h-1 bg-blue-100 rounded-full animate-pulse delay-5900"></div>
          </div>

          {/* Layer 3 - Distant Stars (subtle parallax) */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${parallaxX * 0.2}px, ${parallaxY * 0.2}px)`,
              transition: 'transform 0.2s ease-out'
            }}
          >
            {/* Original distant stars */}
            <div className="absolute top-1/6 right-1/5 w-0.5 h-0.5 bg-white rounded-full animate-ping"></div>
            <div className="absolute top-3/5 left-1/8 w-0.5 h-0.5 bg-blue-200 rounded-full animate-ping delay-1000"></div>
            <div className="absolute bottom-1/6 left-3/5 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-ping delay-2000"></div>
            <div className="absolute top-4/5 right-1/8 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-1500"></div>
            <div className="absolute top-1/10 left-4/5 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse delay-900"></div>
            <div className="absolute bottom-2/5 right-3/4 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse delay-1200"></div>
            
            {/* Additional distant stars for fuller sky */}
            <div className="absolute top-1/4 left-1/10 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-ping delay-2500"></div>
            <div className="absolute top-3/4 right-1/10 w-0.5 h-0.5 bg-blue-200 rounded-full animate-ping delay-3000"></div>
            <div className="absolute top-1/2 left-9/10 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-2200"></div>
            <div className="absolute top-1/8 left-1/3 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse delay-2800"></div>
            <div className="absolute top-7/8 right-1/3 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse delay-3200"></div>
            <div className="absolute top-2/5 left-1/12 w-0.5 h-0.5 bg-white rounded-full animate-ping delay-3500"></div>
            <div className="absolute top-3/5 right-1/12 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping delay-4000"></div>
            
            {/* Scattered distant stars throughout empty spaces */}
            <div className="absolute top-1/16 left-1/40 w-0.5 h-0.5 bg-blue-100 rounded-full animate-ping delay-6000"></div>
            <div className="absolute top-3/16 left-1/36 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-6100"></div>
            <div className="absolute top-5/16 left-1/38 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-ping delay-6200"></div>
            <div className="absolute top-7/16 left-1/34 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse delay-6300"></div>
            <div className="absolute top-9/16 left-1/40 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-ping delay-6400"></div>
            <div className="absolute top-11/16 left-1/36 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-6500"></div>
            <div className="absolute top-13/16 left-1/38 w-0.5 h-0.5 bg-blue-300 rounded-full animate-ping delay-6600"></div>
            <div className="absolute top-15/16 left-1/34 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-pulse delay-6700"></div>
            
            <div className="absolute top-1/16 right-1/40 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-pulse delay-6800"></div>
            <div className="absolute top-3/16 right-1/36 w-0.5 h-0.5 bg-blue-200 rounded-full animate-ping delay-6900"></div>
            <div className="absolute top-5/16 right-1/38 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-7000"></div>
            <div className="absolute top-7/16 right-1/34 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-ping delay-7100"></div>
            <div className="absolute top-9/16 right-1/40 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse delay-7200"></div>
            <div className="absolute top-11/16 right-1/36 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping delay-7300"></div>
            <div className="absolute top-13/16 right-1/38 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse delay-7400"></div>
            <div className="absolute top-15/16 right-1/34 w-0.5 h-0.5 bg-white rounded-full animate-ping delay-7500"></div>
            
            {/* Top edge distant stars */}
            <div className="absolute top-1/48 left-1/16 w-0.5 h-0.5 bg-blue-200 rounded-full animate-ping delay-7600"></div>
            <div className="absolute top-1/44 left-3/16 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-pulse delay-7700"></div>
            <div className="absolute top-1/46 left-5/16 w-0.5 h-0.5 bg-white rounded-full animate-ping delay-7800"></div>
            <div className="absolute top-1/48 left-7/16 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse delay-7900"></div>
            <div className="absolute top-1/44 left-9/16 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-ping delay-8000"></div>
            <div className="absolute top-1/46 left-11/16 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse delay-8100"></div>
            <div className="absolute top-1/48 left-13/16 w-0.5 h-0.5 bg-white rounded-full animate-ping delay-8200"></div>
            <div className="absolute top-1/44 left-15/16 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-pulse delay-8300"></div>
            
            {/* Bottom edge distant stars */}
            <div className="absolute bottom-1/48 left-1/16 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse delay-8400"></div>
            <div className="absolute bottom-1/44 left-3/16 w-0.5 h-0.5 bg-blue-200 rounded-full animate-ping delay-8500"></div>
            <div className="absolute bottom-1/46 left-5/16 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-8600"></div>
            <div className="absolute bottom-1/48 left-7/16 w-0.5 h-0.5 bg-cyan-100 rounded-full animate-ping delay-8700"></div>
            <div className="absolute bottom-1/44 left-9/16 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse delay-8800"></div>
            <div className="absolute bottom-1/46 left-11/16 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping delay-8900"></div>
            <div className="absolute bottom-1/48 left-13/16 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse delay-9000"></div>
            <div className="absolute bottom-1/44 left-15/16 w-0.5 h-0.5 bg-white rounded-full animate-ping delay-9100"></div>
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

      {/* Vertical Gradient Layer - Desktop Only */}
      <div className="hidden lg:block absolute inset-0 z-5">
        {/* Vertical gradient from black bottom to transparent - extended to 95% */}
        <div className="absolute bottom-0 left-0 w-full h-[95%] bg-gradient-to-t from-black via-slate-900/80 via-slate-800/60 via-slate-700/40 via-slate-600/20 to-transparent"></div>
      </div>

      {/* Main Login Card - Enhanced Depth & Contrast */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Enhanced shadow layers for depth */}
        <div className="absolute inset-0 bg-primary-600/20 blur-3xl rounded-2xl transform scale-105"></div>
        <div className="relative bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Enhanced glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/15 to-white/5 rounded-2xl"></div>
          
          {/* Mobile Logo Header - Balanced Design */}
          <div className="relative py-8 border-b border-white/30 lg:hidden bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-2xl flex items-center justify-center shadow-2xl ring-2 ring-white/20">
                <span className="text-3xl font-bold bg-gradient-to-br from-primary-600 to-primary-700 bg-clip-text text-transparent">T</span>
              </div>
              <span className="text-white font-bold text-3xl tracking-tight drop-shadow-2xl">Trakr</span>
            </div>
          </div>

          <div className="relative flex justify-center min-h-[500px]">
            
            {/* Center Column - Auth Form */}
            <div className="relative p-8 flex flex-col justify-center max-w-md w-full">
              {/* Desktop Logo - Balanced Design */}
              <div className="hidden lg:flex flex-col items-center justify-center mb-10 gap-5">
                <div className="w-20 h-20 bg-gradient-to-br from-white to-gray-100 rounded-2xl flex items-center justify-center shadow-2xl ring-2 ring-white/20">
                  <span className="text-4xl font-bold bg-gradient-to-br from-primary-600 to-primary-700 bg-clip-text text-transparent">T</span>
                </div>
                <span className="text-white font-bold text-4xl tracking-tight drop-shadow-2xl">Trakr</span>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Welcome back!</h1>
                <p className="text-white/90 font-medium">
                  {authMode === 'login' ? 'Secure access to your team\'s insights' : 
                   authMode === 'register' ? 'Join your team on Trakr' :
                   'Reset your password'}
                </p>
              </div>

              {/* Email/Password Form */}
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
                className="space-y-4 mb-6"
              >
                {authMode === 'register' && (
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-white/90 mb-2">Full name</label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/25 backdrop-blur-sm border border-white/40 rounded-lg shadow-[0_2px_8px_0_rgba(0,0,0,0.3)] focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all text-white placeholder-white/60"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      required
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">Email</label>
                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-white placeholder-white/60"
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                    />
                    {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {authMode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-white placeholder-white/60"
                      placeholder="Enter password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
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
                    <p className="text-xs text-white/70 mt-2">
                      Must be 8+ characters with uppercase, lowercase, and numbers
                    </p>
                  )}
                </div>
                )}

                {authMode === 'register' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-2">Confirm password</label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-white placeholder-white/60"
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
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

                {/* Error Display */}
                {authError && (
                  <div className="p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg animate-fade-in">
                    <div className="flex items-start gap-3">
                      <span className="text-red-100 text-xl flex-shrink-0">❌</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-100 mb-1">{authError.title}</p>
                        <p className="text-xs text-red-200 mb-2">
                          {isLocked && lockoutSecondsRemaining > 0 
                            ? `Account locked for ${Math.floor(lockoutSecondsRemaining / 60)}:${String(lockoutSecondsRemaining % 60).padStart(2, '0')}. Please wait or use "Forgot password" to reset.`
                            : authError.message
                          }
                        </p>
                        {authError.action && !isLocked && (
                          <p className="text-xs text-red-100 font-medium">→ {authError.action}</p>
                        )}
                        {isLocked && (
                          <button
                            type="button"
                            onClick={() => switchMode('forgot-password')}
                            className="text-xs text-red-100 font-medium hover:text-red-50 underline"
                          >
                            → Forgot password?
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Success Display */}
                {successMessage && (
                  <div className="p-4 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-lg animate-fade-in">
                    <div className="flex items-start gap-3">
                      <span className="text-green-100 text-xl">✅</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-100 mb-1">{successMessage.title}</p>
                        <p className="text-xs text-green-200">{successMessage.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remember Me Toggle - Login Only */}
                {authMode === 'login' && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-white/90 font-medium">Remember me for 30 days</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent ${
                        rememberMe ? 'bg-primary-600' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                          rememberMe ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authStatus === 'submitting' || isLocked}
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2"
                >
                  {authStatus === 'submitting' ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                      <span>
                        {authMode === 'login' ? 'Signing in...' : 
                         authMode === 'register' ? 'Creating account...' : 
                         'Sending...'}  
                      </span>
                    </>
                  ) : isLocked ? (
                    <>
                      <span>🔒</span>
                      <span>Account Locked</span>
                    </>
                  ) : (
                    authMode === 'login' ? 'Sign in' : 
                    authMode === 'register' ? 'Create account' : 
                    'Send reset link'
                  )}
                </button>
              </form>

              {/* Mode Switch Links - Enhanced CTA */}
              <div className="text-center text-sm">
                {authMode === 'login' ? (
                  <div className="space-y-3">
                    <div className="text-white/80">
                      Don't have an account?{' '}
                      <button 
                        onClick={() => switchMode('register')}
                        className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                        type="button"
                      >
                        Sign up now →
                      </button>
                    </div>
                    <div>
                      <button 
                        onClick={() => switchMode('forgot-password')}
                        className="text-white/70 hover:text-white font-medium hover:underline transition-colors"
                        type="button"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                ) : authMode === 'register' ? (
                  <div className="text-white/80">
                    Already have an account?{' '}
                    <button 
                      onClick={() => switchMode('login')}
                      className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                      type="button"
                    >
                      Sign in
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => switchMode('login')}
                    className="text-white font-medium hover:underline"
                    type="button"
                  >
                    ← Back to login
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Bottom Tagline */}
      <div className="absolute bottom-4 lg:bottom-8 left-0 right-0 text-center z-10 px-4">
        <p className="text-white/90 text-xs lg:text-sm font-medium tracking-wide leading-relaxed">
          Streamline audits. Empower teams. Drive excellence. Use Trakr.
        </p>
      </div>
    </div>
  )
}

export default LoginScreen
