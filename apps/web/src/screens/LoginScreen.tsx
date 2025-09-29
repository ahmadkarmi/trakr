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

      {/* Minimalist Black Globe Layer - Desktop Only */}
      <div className="hidden lg:block absolute inset-0 z-5">
        {/* Large globe covering bottom half */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-[1400px] h-[1400px]">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              {/* Subtle atmospheric glow */}
              <radialGradient id="atmosphereGlow" cx="0.5" cy="0.5" r="0.7">
                <stop offset="0%" stopColor="transparent"/>
                <stop offset="75%" stopColor="rgba(148, 163, 184, 0.05)"/>
                <stop offset="85%" stopColor="rgba(148, 163, 184, 0.1)"/>
                <stop offset="95%" stopColor="rgba(148, 163, 184, 0.15)"/>
                <stop offset="100%" stopColor="rgba(148, 163, 184, 0.2)"/>
              </radialGradient>
              
              {/* Black globe with subtle gradient */}
              <radialGradient id="globeGradient" cx="0.3" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#1e293b"/>
                <stop offset="40%" stopColor="#0f172a"/>
                <stop offset="70%" stopColor="#020617"/>
                <stop offset="90%" stopColor="#000000"/>
                <stop offset="100%" stopColor="#000000"/>
              </radialGradient>
              
              {/* Edge highlight */}
              <radialGradient id="edgeGlow" cx="0.2" cy="0.2" r="1.2">
                <stop offset="0%" stopColor="rgba(148, 163, 184, 0.1)"/>
                <stop offset="60%" stopColor="rgba(148, 163, 184, 0.05)"/>
                <stop offset="85%" stopColor="rgba(148, 163, 184, 0.15)"/>
                <stop offset="95%" stopColor="rgba(148, 163, 184, 0.25)"/>
                <stop offset="100%" stopColor="rgba(148, 163, 184, 0.3)"/>
              </radialGradient>
            </defs>
            
            {/* Outer atmospheric glow */}
            <circle cx="200" cy="200" r="220" fill="url(#atmosphereGlow)" opacity="0.6"/>
            
            {/* Main black globe */}
            <circle cx="200" cy="200" r="190" fill="url(#globeGradient)"/>
            
            {/* Subtle edge highlight for depth */}
            <circle cx="200" cy="200" r="190" fill="url(#edgeGlow)" opacity="0.4"/>
            
            {/* Subtle surface texture with minimal detail */}
            <g opacity="0.1">
              <circle cx="150" cy="120" r="15" fill="rgba(148, 163, 184, 0.1)"/>
              <circle cx="280" cy="160" r="20" fill="rgba(148, 163, 184, 0.08)"/>
              <circle cx="200" cy="250" r="12" fill="rgba(148, 163, 184, 0.12)"/>
              <circle cx="320" cy="220" r="18" fill="rgba(148, 163, 184, 0.09)"/>
              <circle cx="120" cy="280" r="10" fill="rgba(148, 163, 184, 0.11)"/>
            </g>
          </svg>
        </div>
        
        {/* Subtle horizon fade */}
        <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-black/20 via-slate-900/10 to-transparent"></div>
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
      <div className="absolute bottom-4 lg:bottom-8 left-0 right-0 text-center z-10 px-4">
        <p className="text-white/90 text-xs lg:text-sm font-medium tracking-wide leading-relaxed">
          LET'S MAKE THE WORLD MORE PRODUCTIVE, TOGETHER.
        </p>
      </div>
    </div>
  )
}

export default LoginScreen
