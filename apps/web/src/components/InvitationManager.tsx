import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { useOrganization } from '../contexts/OrganizationContext'
import { PaperAirplaneIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { UserInvitation } from '@trakr/shared'

interface InviteFormData {
  email: string
  role: string
}

const InvitationManager: React.FC = () => {
  const { user } = useAuthStore()
  const { effectiveOrgId } = useOrganization()
  const queryClient = useQueryClient()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    role: 'BRANCH_MANAGER'
  })

  // Fetch pending invitations
  const { data: invitations = [], isLoading } = useQuery<UserInvitation[]>({
    queryKey: ['invitations', effectiveOrgId],
    queryFn: () => api.getPendingInvitations(effectiveOrgId!),
    enabled: !!effectiveOrgId
  })

  // Create invitation mutation
  const createInviteMutation = useMutation<UserInvitation, Error, InviteFormData>({
    mutationFn: (data: InviteFormData) => 
      api.createInvitation({
        orgId: effectiveOrgId!,
        email: data.email,
        role: data.role,
        invitedBy: user!.id
      }),
    onSuccess: (invitation: UserInvitation) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', effectiveOrgId] })
      toast.success(`Invitation sent to ${invitation.email}`)
      
      // Copy invitation link to clipboard
      const inviteUrl = `${window.location.origin}/onboarding/user?token=${invitation.invitationToken}`
      navigator.clipboard.writeText(inviteUrl).then(() => {
        toast.success('Invitation link copied to clipboard!')
      }).catch(() => {
        // Fallback: show the link
        console.log('Invitation link:', inviteUrl)
      })
      
      // Reset form
      setInviteForm({ email: '', role: 'BRANCH_MANAGER' })
      setShowInviteForm(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation')
    }
  })

  // Delete invitation mutation
  const deleteInviteMutation = useMutation<void, Error, string>({
    mutationFn: (invitationId: string) => api.deleteInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', effectiveOrgId] })
      toast.success('Invitation revoked')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke invitation')
    }
  })

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email.trim() || !inviteForm.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    createInviteMutation.mutate(inviteForm)
  }

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/onboarding/user?token=${token}`
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast.success('Invitation link copied to clipboard!')
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getExpiresIn = (expiresAt: Date) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    return `Expires in ${diffDays} days`
  }

  if (!effectiveOrgId) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Team Invitations</h3>
          <p className="text-sm text-gray-600 mt-1">Invite new team members to join your organization</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
          Send Invitation
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 animate-fadeIn">
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="BRANCH_MANAGER">Branch Manager</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createInviteMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                {createInviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Invitations List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Pending Invitations</h4>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <PaperAirplaneIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No pending invitations</p>
            <p className="text-sm mt-1">Send an invitation to add team members</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-gray-900 truncate">{invitation.email}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {invitation.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {getExpiresIn(invitation.expiresAt)}
                      </span>
                      <span>Sent {formatDate(invitation.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(invitation.invitationToken)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => deleteInviteMutation.mutate(invitation.id)}
                      disabled={deleteInviteMutation.isPending}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Revoke invitation"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Invitation links are valid for 7 days. Recipients must sign in or create an account to accept the invitation.
        </p>
      </div>
    </div>
  )
}

export default InvitationManager
