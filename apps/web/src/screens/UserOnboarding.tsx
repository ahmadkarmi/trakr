import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api'
import { logger } from '../utils/logger'
import { 
  CheckCircleIcon, 
  EnvelopeIcon, 
  UserCircleIcon, 
  BuildingOfficeIcon,
  SparklesIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const UserOnboarding: React.FC = () => {
  const { user, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState('')
  
  // Step 2: Profile setup
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const invitationToken = searchParams.get('token')

  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationToken) {
        setError('No invitation token provided')
        setIsLoading(false)
        return
      }

      try {
        const inv = await api.getInvitationByToken(invitationToken)
        if (!inv) {
          setError('Invalid or expired invitation')
          setIsLoading(false)
          return
        }

        setInvitation(inv)
        setIsLoading(false)
      } catch (err: any) {
        logger.error('Failed to load invitation', err, { context: 'UserOnboarding' })
        setError('Failed to load invitation')
        setIsLoading(false)
      }
    }

    loadInvitation()
  }, [invitationToken])

  const handleAcceptInvitation = async () => {
    if (!user || !invitation) return

    setIsSubmitting(true)
    try {
      const result = await api.acceptInvitation({
        token: invitation.invitationToken,
        userId: user.id
      })

      if (!result.success) {
        throw new Error('Failed to accept invitation')
      }

      // Reload user data to get updated org/role
      const updatedUser = await api.getUserById(user.id)
      if (updatedUser) {
        updateUser(updatedUser)
      }

      toast.success('Invitation accepted!')
      setCurrentStep(2)
    } catch (err: any) {
      logger.error('Failed to accept invitation', err, { context: 'UserOnboarding' })
      toast.error(err.message || 'Failed to accept invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }

    if (!user) return

    setIsSubmitting(true)
    try {
      // Update user profile
      await api.updateUser(user.id, {
        name: fullName.trim(),
        phone: phone.trim() || undefined
      })

      // Mark onboarding as complete
      await api.updateOnboardingProgress({
        userId: user.id,
        step: 3,
        completed: true,
        data: { profileCompleted: true }
      })

      // Update local state
      const updatedUser = { ...user, name: fullName.trim(), phone: phone.trim() || undefined }
      updateUser(updatedUser)

      toast.success('Profile completed!')
      setCurrentStep(3)

      // Redirect to appropriate dashboard
      setTimeout(() => {
        switch (user.role) {
          case 'ADMIN':
            navigate('/dashboard/admin')
            break
          case 'BRANCH_MANAGER':
            navigate('/dashboard/branch-manager')
            break
          case 'AUDITOR':
            navigate('/dashboard/auditor')
            break
          default:
            navigate('/dashboard')
        }
      }, 1500)
    } catch (err: any) {
      logger.error('Failed to complete profile', err, { context: 'UserOnboarding' })
      toast.error(err.message || 'Failed to complete profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{error || 'This invitation is invalid or has expired.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep > step
                        ? 'bg-green-500 text-white'
                        : currentStep === step
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      <span className="font-bold">{step}</span>
                    )}
                  </div>
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 transition-all ${
                      currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Step 1: Accept Invitation */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <EnvelopeIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">You're Invited!</h2>
                <p className="text-gray-600">Join an organization on Trakr</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
                <div className="flex items-start">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Organization</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {invitation.orgId}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <UserCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Your Role</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {invitation.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-lg font-semibold text-gray-900">{invitation.email}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAcceptInvitation}
                disabled={isSubmitting || !user}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Accepting...' : 'Accept Invitation'}
              </button>

              {!user && (
                <p className="text-center text-sm text-gray-600">
                  Please{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    sign in
                  </button>{' '}
                  to accept this invitation
                </p>
              )}
            </div>
          )}

          {/* Step 2: Complete Profile */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <UserCircleIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
                <p className="text-gray-600">Tell us a bit about yourself</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <button
                onClick={handleCompleteProfile}
                disabled={isSubmitting || !fullName.trim()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="text-center space-y-6 animate-fade-in">
              <SparklesIcon className="w-20 h-20 text-green-500 mx-auto" />
              <h2 className="text-3xl font-bold text-gray-900">Welcome to the Team!</h2>
              <p className="text-lg text-gray-600">
                Your account is ready. Redirecting to your dashboard...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserOnboarding
