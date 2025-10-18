import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api'
import { CheckCircleIcon, BuildingOfficeIcon, UserGroupIcon, MapIcon, SparklesIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: React.ElementType
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Create Your Organization',
    description: 'Give your organization a name to get started',
    icon: BuildingOfficeIcon
  },
  {
    id: 2,
    title: 'Set Up Your Structure',
    description: 'We\'ll help you organize your locations',
    icon: MapIcon
  },
  {
    id: 3,
    title: 'Invite Your Team',
    description: 'Add branch managers and auditors',
    icon: UserGroupIcon
  },
  {
    id: 4,
    title: 'All Set!',
    description: 'You\'re ready to start managing audits',
    icon: SparklesIcon
  }
]

const AdminOnboarding: React.FC = () => {
  const { user, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Step 1: Organization name
  const [orgName, setOrgName] = useState('')
  
  // Step 2: Initial zone/branch setup (optional)
  const [zoneName, setZoneName] = useState('')
  const [branchName, setbranchName] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [skipStep2, setSkipStep2] = useState(false)
  
  // Step 3: Team invitations (optional)
  const [inviteEmails, setInviteEmails] = useState<Array<{ email: string; role: string }>>([
    { email: '', role: 'BRANCH_MANAGER' }
  ])
  const [skipStep3, setSkipStep3] = useState(false)

  if (!user) {
    return null
  }

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error('Please enter an organization name')
      return
    }

    setIsSubmitting(true)
    try {
      const org = await api.createOrganizationForAdmin({
        name: orgName.trim(),
        userId: user.id,
        email: user.email
      })

      // Update local user state with new org
      const updatedUser = { ...user, orgId: org.id }
      updateUser(updatedUser)

      // Track onboarding progress
      await api.updateOnboardingProgress({
        userId: user.id,
        step: 2,
        data: { orgName: orgName.trim() }
      })

      toast.success('Organization created successfully!')
      setCurrentStep(2)
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      toast.error(error.message || 'Failed to create organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetupStructure = async () => {
    if (skipStep2) {
      await api.updateOnboardingProgress({
        userId: user.id,
        step: 3,
        data: { skippedStructure: true }
      })
      setCurrentStep(3)
      return
    }

    if (!zoneName.trim()) {
      toast.error('Please enter a zone name or skip this step')
      return
    }

    setIsSubmitting(true)
    try {
      // Create zone
      const zone = await api.createZone({
        name: zoneName.trim(),
        description: '',
        orgId: user.orgId!,
        branchIds: []
      })

      // Create branch if provided
      if (branchName.trim()) {
        await api.createBranch({
          name: branchName.trim(),
          address: branchAddress.trim() || '',
          orgId: user.orgId!,
          managerId: undefined
        })
      }

      await api.updateOnboardingProgress({
        userId: user.id,
        step: 3,
        data: { zone: zoneName, branch: branchName }
      })

      toast.success('Structure set up successfully!')
      setCurrentStep(3)
    } catch (error: any) {
      console.error('Failed to set up structure:', error)
      toast.error(error.message || 'Failed to set up structure')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteTeam = async () => {
    if (skipStep3) {
      await api.updateOnboardingProgress({
        userId: user.id,
        step: 4,
        completed: true,
        data: { skippedInvitations: true }
      })
      setCurrentStep(4)
      setTimeout(() => navigate('/dashboard/admin'), 1500)
      return
    }

    const validEmails = inviteEmails.filter(inv => inv.email.trim() && inv.email.includes('@'))
    
    if (validEmails.length === 0) {
      toast.error('Please enter at least one valid email or skip this step')
      return
    }

    setIsSubmitting(true)
    try {
      // Send invitations
      await Promise.all(
        validEmails.map(inv =>
          api.createInvitation({
            orgId: user.orgId!,
            email: inv.email.trim(),
            role: inv.role,
            invitedBy: user.id
          })
        )
      )

      await api.updateOnboardingProgress({
        userId: user.id,
        step: 4,
        completed: true,
        data: { invitationsSent: validEmails.length }
      })

      toast.success(`Invitations sent to ${validEmails.length} team member(s)!`)
      setCurrentStep(4)
      setTimeout(() => navigate('/dashboard/admin'), 1500)
    } catch (error: any) {
      console.error('Failed to send invitations:', error)
      toast.error(error.message || 'Failed to send invitations')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addInviteField = () => {
    setInviteEmails([...inviteEmails, { email: '', role: 'BRANCH_MANAGER' }])
  }

  const removeInviteField = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index))
  }

  const updateInviteField = (index: number, field: 'email' | 'role', value: string) => {
    const updated = [...inviteEmails]
    updated[index][field] = value
    setInviteEmails(updated)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <p className={`text-xs text-center font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Step 1: Create Organization */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <BuildingOfficeIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Trakr!</h2>
                <p className="text-gray-600">Let's start by creating your organization</p>
              </div>

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Acme Corporation"
                  autoFocus
                />
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={isSubmitting || !orgName.trim()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          )}

          {/* Step 2: Set Up Structure */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <MapIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Organize Your Locations</h2>
                <p className="text-gray-600">Create zones and branches to structure your organization</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="zoneName" className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Name (e.g., North Region, Downtown District)
                  </label>
                  <input
                    id="zoneName"
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    disabled={skipStep2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g., East Coast Region"
                  />
                </div>

                <div>
                  <label htmlFor="branchName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Branch Name (Optional)
                  </label>
                  <input
                    id="branchName"
                    type="text"
                    value={branchName}
                    onChange={(e) => setbranchName(e.target.value)}
                    disabled={skipStep2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g., Downtown Store"
                  />
                </div>

                <div>
                  <label htmlFor="branchAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Address (Optional)
                  </label>
                  <input
                    id="branchAddress"
                    type="text"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    disabled={skipStep2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="123 Main St"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="skipStep2"
                    type="checkbox"
                    checked={skipStep2}
                    onChange={(e) => setSkipStep2(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="skipStep2" className="ml-2 block text-sm text-gray-700">
                    Skip for now (I'll add locations later)
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSetupStructure}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Setting up...' : skipStep2 ? 'Skip & Continue' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <UserGroupIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Invite Your Team</h2>
                <p className="text-gray-600">Add branch managers and auditors to your organization</p>
              </div>

              <div className="space-y-4">
                {inviteEmails.map((invite, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(e) => updateInviteField(index, 'email', e.target.value)}
                      disabled={skipStep3}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="email@example.com"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) => updateInviteField(index, 'role', e.target.value)}
                      disabled={skipStep3}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="BRANCH_MANAGER">Branch Manager</option>
                      <option value="AUDITOR">Auditor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {inviteEmails.length > 1 && (
                      <button
                        onClick={() => removeInviteField(index)}
                        disabled={skipStep3}
                        className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                {!skipStep3 && (
                  <button
                    onClick={addInviteField}
                    className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    + Add Another
                  </button>
                )}

                <div className="flex items-center pt-4">
                  <input
                    id="skipStep3"
                    type="checkbox"
                    checked={skipStep3}
                    onChange={(e) => setSkipStep3(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="skipStep3" className="ml-2 block text-sm text-gray-700">
                    Skip for now (I'll invite my team later)
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleInviteTeam}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Sending...' : skipStep3 ? 'Skip & Finish' : 'Send Invitations'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center space-y-6 animate-fadeIn">
              <SparklesIcon className="w-20 h-20 text-green-500 mx-auto" />
              <h2 className="text-3xl font-bold text-gray-900">You're All Set!</h2>
              <p className="text-lg text-gray-600">
                Your organization is ready. Redirecting to your dashboard...
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

export default AdminOnboarding
