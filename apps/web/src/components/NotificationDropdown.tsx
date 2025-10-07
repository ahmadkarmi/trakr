import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Notification, NotificationType, Audit, Branch, User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { BellIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/auth'
import { backfillAuditNotifications } from '../utils/backfillNotifications'
import { useOrganization } from '../contexts/OrganizationContext'

const NotificationDropdown: React.FC = () => {
  const { user } = useAuthStore()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState(0)
  const [touchEnd, setTouchEnd] = React.useState(0)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Backfill notifications for existing SUBMITTED audits (run once per session)
  React.useEffect(() => {
    const hasBackfilled = sessionStorage.getItem('notificationsBackfilled')
    if (!hasBackfilled && user?.id) {
      // Set flag IMMEDIATELY to prevent race condition in StrictMode
      sessionStorage.setItem('notificationsBackfilled', 'true')
      console.log('🔄 Running notification backfill for user:', user?.id)
      backfillAuditNotifications()
        .then((count) => {
          console.log(`📊 Backfill result: ${count} notifications created`)
          if (count !== undefined && count > 0) {
            // Invalidate queries to refetch notifications
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user?.id) })
              queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
            }, 500) // Small delay to ensure database writes complete
          }
          console.log('✅ Notification backfill complete')
        })
        .catch((error) => {
          console.error('❌ Notification backfill failed:', error)
          // Remove flag on error so it can retry next time
          sessionStorage.removeItem('notificationsBackfilled')
        })
    }
  }, [user?.id, queryClient])

  // Detect mobile viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch notifications from database
  // Admins see ALL notifications (super user), others see only their own
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
  
  const { data: allNotifications = [], error: notificationsError } = useQuery<Notification[]>({
    queryKey: isAdmin ? QK.NOTIFICATIONS('all') : QK.NOTIFICATIONS(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID, skipping notification fetch')
        return []
      }
      
      if (isAdmin) {
        console.log(`🔍 [ADMIN] Fetching ALL notifications`)
        // Admin gets all notifications
        const result = await api.getAllNotifications()
        console.log(`📧 [ADMIN] Fetched ${result.length} notifications from database`)
        return result
      } else {
        console.log(`🔍 Fetching notifications for user ID: ${user.id}`)
        const result = await api.getNotifications(user.id)
        console.log(`📧 Fetched ${result.length} notifications from database`)
        return result
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
  
  // Log any errors
  React.useEffect(() => {
    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError)
    }
  }, [notificationsError])

  // Fetch audits, branches, and users to derive notifications if empty
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ['audits', 'all', effectiveOrgId],
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: !!user?.id && (!!effectiveOrgId || isSuperAdmin),
  })

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => api.getBranches(effectiveOrgId),
    enabled: !!user?.id && (!!effectiveOrgId || isSuperAdmin),
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!user?.id && (!!effectiveOrgId || isSuperAdmin),
  })

  // Derive notifications from audits if database is empty
  // Only use derived notifications as fallback when NO database notifications exist
  const notifications = React.useMemo((): Notification[] => {
    // Always prefer database notifications if they exist
    if (allNotifications.length > 0 || !user) {
      console.log(`📧 Using ${allNotifications.length} database notifications`)
      return allNotifications
    }
    
    console.log('⚠️ No database notifications found, deriving from audit data...')

    const derived: Notification[] = []
    const userRole = user.role

    audits.forEach(audit => {
      const branch = branches.find(b => b.id === audit.branchId)
      const branchName = branch?.name || 'Unknown Branch'
      const auditor = users.find(u => u.id === audit.assignedTo)
      const auditorName = auditor?.name || 'Unknown Auditor'
      const statusLower = audit.status?.toLowerCase()
      
      // Submitted audits for managers/admins
      if ((userRole === UserRole.BRANCH_MANAGER || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) && 
          statusLower === 'submitted' && audit.submittedBy && audit.submittedAt) {
        derived.push({
          id: `${audit.id}-submitted`,
          userId: user.id,
          type: NotificationType.AUDIT_SUBMITTED,
          title: '✅ Audit Submitted for Approval',
          message: `${auditorName} submitted an audit for ${branchName}`,
          link: `/audits/${audit.id}/summary`,
          isRead: false,
          createdAt: new Date(audit.submittedAt),
          relatedId: audit.id,
          requiresAction: true,
          actionType: 'REVIEW_AUDIT',
        })
      }

      // Approved audits for admins
      if ((userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) && 
          statusLower === 'approved' && audit.approvedBy && audit.approvedAt) {
        const approver = users.find(u => u.id === audit.approvedBy)
        derived.push({
          id: `${audit.id}-approved-admin`,
          userId: user.id,
          type: NotificationType.AUDIT_APPROVED,
          title: '✅ Audit Approved',
          message: `${branchName} audit was approved by ${approver?.name || 'Manager'}`,
          link: `/audits/${audit.id}/summary`,
          isRead: false,
          createdAt: new Date(audit.approvedAt),
          relatedId: audit.id,
          requiresAction: false,
        })
      }

      // Approved audits for auditors
      if (userRole === UserRole.AUDITOR && audit.assignedTo === user.id &&
          statusLower === 'approved' && audit.approvedBy && audit.approvedAt) {
        const approver = users.find(u => u.id === audit.approvedBy)
        derived.push({
          id: `${audit.id}-approved`,
          userId: user.id,
          type: NotificationType.AUDIT_APPROVED,
          title: '✅ Audit Approved',
          message: `Your audit for ${branchName} was approved by ${approver?.name || 'Manager'}`,
          link: `/audits/${audit.id}/summary`,
          isRead: false,
          createdAt: new Date(audit.approvedAt),
          relatedId: audit.id,
          requiresAction: false,
        })
      }

      // Rejected audits for auditors
      if (userRole === UserRole.AUDITOR && audit.assignedTo === user.id &&
          statusLower === 'rejected' && audit.rejectedBy && audit.rejectedAt) {
        const rejecter = users.find(u => u.id === audit.rejectedBy)
        derived.push({
          id: `${audit.id}-rejected`,
          userId: user.id,
          type: NotificationType.AUDIT_REJECTED,
          title: '❌ Audit Rejected',
          message: audit.rejectionNote 
            ? `Your audit for ${branchName} was rejected by ${rejecter?.name || 'Manager'}: ${audit.rejectionNote}`
            : `Your audit for ${branchName} was rejected by ${rejecter?.name || 'Manager'}`,
          link: `/audits/${audit.id}/summary`,
          isRead: false,
          createdAt: new Date(audit.rejectedAt),
          relatedId: audit.id,
          requiresAction: true,
          actionType: 'REVIEW_AUDIT',
        })
      }
    })

    return derived.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [allNotifications, audits, branches, users, user])

  // Fetch unread count
  const unreadCount = React.useMemo(() => {
    return notifications.filter(n => !n.isRead).length
  }, [notifications])

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => {
      console.log(`🔄 markAsReadMutation called for: ${notificationId}`)
      // Only mark as read if it's a real database notification (valid UUID)
      // Derived notifications have composite IDs like "audit-id-approved-admin"
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId)
      if (!isUUID) {
        console.log(`⚠️ Skipping derived notification: ${notificationId}`)
        // Skip derived notifications
        return Promise.resolve()
      }
      console.log(`📡 Calling API to mark notification as read`)
      return api.markNotificationAsRead(notificationId)
    },
    onSuccess: (_, notificationId) => {
      console.log(`✅ Notification ${notificationId} marked as read successfully`)
      const queryKey = isAdmin ? QK.NOTIFICATIONS('all') : QK.NOTIFICATIONS(user?.id)
      console.log(`🔄 Invalidating queries with key:`, queryKey)
      
      // Force immediate refetch to update badge count
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey })
        queryClient.refetchQueries({ queryKey })
      }, 100)
      
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
    },
    onError: (error, notificationId) => {
      console.error(`❌ Failed to mark notification ${notificationId} as read:`, error)
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('No user ID')
      console.log(`📡 Marking all notifications as read for user: ${user.id}`)
      return api.markAllNotificationsAsRead(user.id)
    },
    onSuccess: () => {
      console.log(`✅ All notifications marked as read successfully`)
      const queryKey = isAdmin ? QK.NOTIFICATIONS('all') : QK.NOTIFICATIONS(user?.id)
      
      // Force immediate refetch to update badge count
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey })
        queryClient.refetchQueries({ queryKey })
      }, 100)
      
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
    },
    onError: (error) => {
      console.error(`❌ Failed to mark all notifications as read:`, error)
    },
  })

  // Auto-mark all unread notifications as read when panel opens
  // DISABLED - Users must click notifications to mark as read
  // This gives better control and visual feedback
  const prevIsOpen = React.useRef(false)
  
  React.useEffect(() => {
    // Commented out auto-mark feature - notifications are marked when clicked instead
    // Only run when dropdown opens and we have database notifications (not derived)
    // if (isOpen && !prevIsOpen.current && allNotifications.length > 0 && notifications && notifications.length > 0) {
    //   const unreadNotifications = notifications.filter(n => !n.isRead)
    //   
    //   if (unreadNotifications.length > 0) {
    //     // Mark each notification as read in the background
    //     unreadNotifications.forEach(n => {
    //       markAsReadMutation.mutate(n.id)
    //     })
    //   }
    // }
    
    prevIsOpen.current = isOpen
  }, [isOpen, notifications, allNotifications.length, user?.id, queryClient])

  // Filter to show recent notifications in dropdown (unread + recently read within 24 hours)
  const dropdownNotifications = React.useMemo(() => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    return notifications
      .filter(n => {
        // Show unread notifications
        if (!n.isRead) return true
        
        // Show recently read notifications (within 24 hours)
        if (n.readAt) {
          const readAt = new Date(n.readAt)
          return readAt > oneDayAgo
        }
        
        return false
      })
      .slice(0, 10) // Show max 10 in dropdown
  }, [notifications])

  // Close dropdown when clicking outside (desktop only)
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // Prevent body scroll when mobile bottom sheet is open
  React.useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isMobile])

  const handleNotificationClick = (notification: Notification) => {
    console.log('🖱️ Notification clicked:', {
      id: notification.id,
      title: notification.title,
      isRead: notification.isRead,
      link: notification.link
    })
    
    // Mark as read (only for real database notifications with valid UUID)
    if (!notification.isRead) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification.id)
      console.log(`📝 Notification isRead=${notification.isRead}, isUUID=${isUUID}`)
      
      if (isUUID) {
        console.log(`✅ Marking notification ${notification.id} as read`)
        markAsReadMutation.mutate(notification.id)
      } else {
        console.log(`⚠️ Skipping mark as read - not a valid UUID: ${notification.id}`)
      }
    } else {
      console.log(`ℹ️ Notification already marked as read`)
    }

    // Navigate to link if provided
    if (notification.link) {
      console.log(`🔗 Navigating to: ${notification.link}`)
      navigate(notification.link)
      setIsOpen(false)
    }
  }

  // Handle swipe to dismiss on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd < -50) {
      // Swiped down more than 50px
      setIsOpen(false)
    }
    setTouchStart(0)
    setTouchEnd(0)
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.AUDIT_ASSIGNED:
        return '📋'
      case NotificationType.AUDIT_SUBMITTED:
        return '✅'
      case NotificationType.AUDIT_APPROVED:
        return '✅'
      case NotificationType.AUDIT_REJECTED:
        return '❌'
      case NotificationType.AUDIT_DUE_SOON:
        return '⏰'
      case NotificationType.AUDIT_OVERDUE:
        return '🔴'
      case NotificationType.SURVEY_CREATED:
        return '📝'
      case NotificationType.BRANCH_ASSIGNED:
        return '🏢'
      default:
        return '🔔'
    }
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diff = now.getTime() - dateObj.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return dateObj.toLocaleDateString()
  }

  return (
    <>
      {/* Bell Icon Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          aria-label="Notifications"
        >
          <BellIcon className="w-6 h-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {/* Desktop Dropdown Menu */}
        {isOpen && !isMobile && (
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                markAllAsReadMutation.mutate()
              }}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Mark all read
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <BellIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
                <p className="text-sm text-gray-500">We'll notify you when there's something new</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dropdownNotifications.map(notification => {
                  const needsAction = notification.requiresAction && !notification.actionCompletedAt
                  
                  return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          {needsAction && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                              Action Required
                            </span>
                          )}
                          {!notification.isRead && !needsAction && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20">
                              New
                            </span>
                          )}
                          {isAdmin && notification.userId !== user?.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-600/20">
                              For: {users.find(u => u.id === notification.userId)?.name || 'User'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {formatTime(notification.createdAt)}
                          </span>
                          {needsAction && (
                            <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleNotificationClick(notification)}
                                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors font-medium"
                              >
                                Review Now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            {dropdownNotifications.length > 0 ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    navigate('/notifications')
                    setIsOpen(false)
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all
                </button>
                <button
                  onClick={() => {
                    navigate('/settings')
                    setIsOpen(false)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Preferences
                </button>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={() => {
                    navigate('/settings')
                    setIsOpen(false)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Notification Preferences
                </button>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {isOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[100] md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[101] md:hidden animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
              {/* Handle Bar & Header - Swipeable Area */}
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Handle Bar */}
                <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markAllAsReadMutation.mutate()
                      }}
                      disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Close"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications List - Scrollable Area */}
              <div className="overflow-y-auto flex-1">
                {dropdownNotifications.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <BellIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-500 text-sm">We'll notify you when there's something new</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {dropdownNotifications.map(notification => {
                      const needsAction = notification.requiresAction && !notification.actionCompletedAt
                      
                      return (
                      <div
                        key={notification.id}
                        className={`px-4 py-4 active:bg-gray-100 transition-colors ${
                          !notification.isRead ? 'bg-blue-50/30' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="text-3xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h4 className="text-base font-semibold text-gray-900">
                                {notification.title}
                              </h4>
                              {needsAction && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  Action Required
                                </span>
                              )}
                              {!notification.isRead && !needsAction && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20">
                                  New
                                </span>
                              )}
                              {isAdmin && notification.userId !== user?.id && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-600/20">
                                  For: {users.find(u => u.id === notification.userId)?.name || 'User'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5" />
                                {formatTime(notification.createdAt)}
                              </span>
                              {needsAction && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleNotificationClick(notification)
                                  }}
                                  className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                                >
                                  Review Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                {dropdownNotifications.length > 0 ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        navigate('/notifications')
                        setIsOpen(false)
                      }}
                      className="w-full py-2.5 text-sm text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      View all notifications
                    </button>
                    <button
                      onClick={() => {
                        navigate('/settings')
                        setIsOpen(false)
                      }}
                      className="w-full py-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Notification Preferences
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setIsOpen(false)
                    }}
                    className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Notification Preferences
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default NotificationDropdown
