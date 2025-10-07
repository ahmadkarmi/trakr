import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Notification, NotificationType, Audit, Branch, User, UserRole } from '@trakr/shared'
import { useAuthStore } from '../stores/auth'
import { QK } from '../utils/queryKeys'
import { api } from '../utils/api'
import { BellIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { SkeletonList } from '@/components/Skeleton'

const NotificationsScreen: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Admins see ALL notifications (super user), others see only their own
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN

  const { data: allNotifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: isAdmin ? QK.NOTIFICATIONS('all') : QK.NOTIFICATIONS(user?.id),
    queryFn: async () => {
      if (!user?.id) return []
      
      if (isAdmin) {
        console.log(`🔍 [ADMIN] Notifications screen fetching ALL notifications`)
        return await api.getAllNotifications()
      } else {
        return await api.getNotifications(user.id)
      }
    },
    enabled: !!user?.id,
  })

  // Always fetch audits, branches, and users to derive notifications
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

  // Derive notifications from audits if table is empty
  const derivedNotifications = React.useMemo((): Notification[] => {
    if (allNotifications.length > 0 || !user) {
      return allNotifications
    }

    const notifications: Notification[] = []
    const userRole = user.role

    audits.forEach(audit => {
      const branch = branches.find(b => b.id === audit.branchId)
      const branchName = branch?.name || 'Unknown Branch'
      const auditor = users.find(u => u.id === audit.assignedTo)
      const auditorName = auditor?.name || 'Unknown Auditor'

      const statusLower = audit.status?.toLowerCase()
      
      // Notifications for Branch Managers/Admins/Super Admins: Submitted audits
      if ((userRole === UserRole.BRANCH_MANAGER || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) && 
          statusLower === 'submitted' && 
          audit.submittedBy && 
          audit.submittedAt) {
        notifications.push({
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

      // Notifications for Admins: Approved audits (informational)
      if ((userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) && 
          statusLower === 'approved' && 
          audit.approvedBy && 
          audit.approvedAt) {
        const approver = users.find(u => u.id === audit.approvedBy)
        notifications.push({
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

      // Notifications for Auditors: Approved audits
      if (userRole === UserRole.AUDITOR && 
          audit.assignedTo === user.id &&
          statusLower === 'approved' && 
          audit.approvedBy && 
          audit.approvedAt) {
        const approver = users.find(u => u.id === audit.approvedBy)
        notifications.push({
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

      // Notifications for Auditors: Rejected audits
      if (userRole === UserRole.AUDITOR && 
          audit.assignedTo === user.id &&
          statusLower === 'rejected' && 
          audit.rejectedBy && 
          audit.rejectedAt) {
        const rejecter = users.find(u => u.id === audit.rejectedBy)
        notifications.push({
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

    // Sort by date descending
    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [allNotifications, audits, branches, users, user])

  // Show up to 50 most recent notifications
  const notifications = React.useMemo(() => {
    return derivedNotifications.slice(0, 50)
  }, [derivedNotifications])

  // Mark as read mutation with optimistic updates for instant feedback
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => api.markNotificationAsRead(notificationId),
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      const queryKey = isAdmin ? QK.NOTIFICATIONS('all') : QK.NOTIFICATIONS(user?.id)
      await queryClient.cancelQueries({ queryKey })
      
      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>(queryKey)
      
      // Optimistically update the notification
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ) || []
      )
      
      // Return context with previous value
      return { previousNotifications, queryKey }
    },
    onError: (_err, _notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(context.queryKey, context.previousNotifications)
      }
    },
    onSuccess: () => {
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('No user ID')
      return api.markAllNotificationsAsRead(user.id)
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      const queryKey = isAdmin ? QK.NOTIFICATIONS('all') : QK.NOTIFICATIONS(user?.id)
      await queryClient.cancelQueries({ queryKey })
      
      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>(queryKey)
      
      // Optimistically mark all as read
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, isRead: true, readAt: new Date() })) || []
      )
      
      return { previousNotifications, queryKey }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(context.queryKey, context.previousNotifications)
      }
    },
    onSuccess: () => {
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
    },
  })

  // Auto-mark disabled - notifications are marked as read when user clicks them
  // This matches the behavior of the notification dropdown
  // Users must explicitly click notifications to mark them as read


  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.AUDIT_SUBMITTED:
        return '📋'
      case NotificationType.AUDIT_APPROVED:
        return '✅'
      case NotificationType.AUDIT_REJECTED:
        return '❌'
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

  const handleNotificationAction = (notification: Notification) => {
    // Mark as read (only for real database notifications with valid UUID)
    if (!notification.isRead) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification.id)
      if (isUUID) {
        markAsReadMutation.mutate(notification.id)
      }
    }

    // Navigate to relevant page
    if (notification.link) {
      navigate(notification.link)
    } else if (notification.relatedId && notification.requiresAction) {
      // Smart routing based on action type
      if (notification.actionType === 'REVIEW_AUDIT') {
        navigate(`/audits/${notification.relatedId}/summary`)
      }
    }
  }

  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Only mark as read if it's a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId)
    if (isUUID) {
      markAsReadMutation.mutate(notificationId)
    }
  }

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    notifications.forEach(notification => {
      const notifDate = new Date(notification.createdAt)
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())

      if (notifDay.getTime() === today.getTime()) {
        groups.today.push(notification)
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification)
      } else if (notifDay >= weekAgo) {
        groups.thisWeek.push(notification)
      } else {
        groups.older.push(notification)
      }
    })

    return groups
  }, [notifications])

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <DashboardLayout title="Notifications">
      <div className="mobile-container breathing-room">
          {/* Header */}
          <div className="mb-6">
            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                  className="btn-secondary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Mark all as read
                </button>
                <BellIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            {/* Mobile Layout - Stacked */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <BellIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
                </p>
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                  className="btn-secondary text-xs px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <SkeletonList items={8} />
          ) : notifications.length === 0 ? (
            <div className="card p-12 text-center">
              <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500">When you have notifications, they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today */}
              {groupedNotifications.today.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Today</h2>
                  <div className="space-y-2">
                    {groupedNotifications.today.map(notification => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onAction={handleNotificationAction}
                        onMarkAsRead={handleMarkAsRead}
                        formatTime={formatTime}
                        getIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Yesterday */}
              {groupedNotifications.yesterday.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Yesterday</h2>
                  <div className="space-y-2">
                    {groupedNotifications.yesterday.map(notification => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onAction={handleNotificationAction}
                        onMarkAsRead={handleMarkAsRead}
                        formatTime={formatTime}
                        getIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* This Week */}
              {groupedNotifications.thisWeek.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">This Week</h2>
                  <div className="space-y-2">
                    {groupedNotifications.thisWeek.map(notification => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onAction={handleNotificationAction}
                        onMarkAsRead={handleMarkAsRead}
                        formatTime={formatTime}
                        getIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Older */}
              {groupedNotifications.older.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Older</h2>
                  <div className="space-y-2">
                    {groupedNotifications.older.map(notification => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onAction={handleNotificationAction}
                        onMarkAsRead={handleMarkAsRead}
                        formatTime={formatTime}
                        getIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </DashboardLayout>
  )
}

interface NotificationCardProps {
  notification: Notification
  onAction: (notification: Notification) => void
  onMarkAsRead: (id: string, e: React.MouseEvent) => void
  formatTime: (date: Date | string) => string
  getIcon: (type: NotificationType) => string
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAction,
  onMarkAsRead,
  formatTime,
  getIcon,
}) => {
  const { user } = useAuthStore()
  const { data: users = [] } = useQuery<User[]>({
    queryKey: QK.USERS,
    queryFn: api.getUsers,
  })
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
  const needsAction = notification.requiresAction && !notification.actionCompletedAt

  return (
    <div
      className={`card p-4 hover:shadow-md transition-all cursor-pointer group ${
        !notification.isRead ? 'bg-blue-50/50 ring-2 ring-blue-100' : ''
      }`}
      onClick={() => onAction(notification)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0">{getIcon(notification.type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-base">{notification.title}</h3>
              {needsAction && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  Action Required
                </span>
              )}
              {isAdmin && notification.userId !== user?.id && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-600/20">
                  For: {users.find(u => u.id === notification.userId)?.name || 'User'}
                </span>
              )}
              {!notification.isRead && !needsAction && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20">
                  New
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 leading-relaxed">{notification.message}</p>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {formatTime(notification.createdAt)}
            </span>

            <div className="flex items-center gap-2">
              {/* Action Button */}
              {needsAction && notification.relatedId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction(notification)
                  }}
                  className="btn-primary btn-sm text-xs flex items-center gap-1.5"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Take Action
                </button>
              )}

              {/* Mark as read */}
              {!notification.isRead && (
                <button
                  onClick={(e) => onMarkAsRead(notification.id, e)}
                  className="btn-outline btn-sm text-xs flex items-center gap-1.5"
                  title="Mark as read"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Mark Read
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsScreen
