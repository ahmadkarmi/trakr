// User invitation types for onboarding system

export interface UserInvitation {
  id: string
  orgId: string
  email: string
  role: string
  invitedBy?: string
  invitationToken: string
  expiresAt: Date
  acceptedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface OnboardingProgress {
  userId: string
  orgId?: string
  onboardingType: 'admin_create_org' | 'invited_user'
  currentStep: number
  totalSteps: number
  completed: boolean
  completedAt?: Date
  data?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface InviteUserRequest {
  email: string
  role: string
  orgId: string
}

export interface AcceptInvitationRequest {
  token: string
  userId: string
}

export interface CreateOrganizationRequest {
  name: string
  userId: string
}
