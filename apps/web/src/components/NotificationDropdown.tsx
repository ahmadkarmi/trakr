import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Notification, NotificationType, Audit, Branch, User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { BellIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/auth'
import { backfillAuditNotifications } from '../utils/backfillNotifications'

const NotificationDropdown: React.FC = () => {
  const { user } = useAuthStore()
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
            queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user?.id) })
            queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
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
  const { data: allNotifications = [] } = useQuery<Notification[]>({
    queryKey: QK.NOTIFICATIONS(user?.id),
    queryFn: async () => {
      if (!user?.id) return []
      return await api.getNotifications(user.id)
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch audits, branches, and users to derive notifications if empty
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: QK.AUDITS('all'),
    queryFn: () => api.getAudits(),
    enabled: !!user?.id,
  })

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.getBranches(),
    enabled: !!user?.id,
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: QK.USERS,
    queryFn: api.getUsers,
    enabled: !!user?.id,
  })

  // Derive notifications from audits if database is empty
  const notifications = React.useMemo((): Notification[] => {
    if (allNotifications.length > 0 || !user) return allNotifications

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
    mutationFn: (notificationId: string) => api.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user?.id) })
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
    },
  })

  // Auto-mark all unread notifications as read when panel opens
  // Only for database notifications, not derived ones
  const prevIsOpen = React.useRef(false)
  
  React.useEffect(() => {
    // Only run when dropdown opens and we have database notifications (not derived)
    if (isOpen && !prevIsOpen.current && allNotifications.length > 0 && notifications && notifications.length > 0) {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      
      if (unreadNotifications.length > 0) {
        // Mark each notification as read in the background
        unreadNotifications.forEach(n => {
          markAsReadMutation.mutate(n.id)
        })
      }
    }
    
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
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id)
    }

    // Navigate to link if provided
    if (notification.link) {
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
          <div className="px-4 py-2 border-b border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
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
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {dropdownNotifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-center">
              <button
                onClick={() => {
                  navigate('/notifications')
                  setIsOpen(false)
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
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
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Notifications List - Scrollable Area */}
              <div className="overflow-y-auto flex-1">
                {dropdownNotifications.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No notifications yet</p>
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
                            </div>
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                              {notification.message}
                            </p>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {dropdownNotifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      navigate('/notifications')
                      setIsOpen(false)
                    }}
                    className="w-full py-3 text-sm text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default NotificationDropdown
