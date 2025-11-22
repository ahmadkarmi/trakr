import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery } from '@tanstack/react-query'
import { Notification, NotificationType, User, UserRole } from '@trakr/shared'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api'
import { BellIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, DocumentPlusIcon, BuildingOfficeIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { SkeletonList } from '@/components/Skeleton'
import { useOrganization } from '../contexts/OrganizationContext'
import { useNotificationsEngine } from '../notifications/useNotifications'

const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate()
  const engine = useNotificationsEngine({ limit: 100, refetchIntervalMs: 30000 })

  // Data is provided by the engine
  const isLoading = engine.loading

  // Reconciliation is handled inside the engine

  // Derivation is handled by the engine (org-scoped)

  // Derivation handled in engine

  // Use engine-provided full-page notifications (read + unread history)
  const notifications = engine.pageNotifications
  const hasMore = engine.hasMore

  // Local derived state handled by engine

  // Actions are provided by the engine

  // Actions are provided by the engine

  // Auto-mark disabled - notifications are marked as read when user clicks them
  // This matches the behavior of the notification dropdown
  // Users must explicitly click notifications to mark them as read


  const getNotificationIcon = (type: NotificationType): React.ReactNode => {
    switch (type) {
      case NotificationType.AUDIT_SUBMITTED:
        return <ClipboardDocumentCheckIcon className="w-6 h-6 text-indigo-600" />
      case NotificationType.AUDIT_APPROVED:
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />
      case NotificationType.AUDIT_REJECTED:
        return <XCircleIcon className="w-6 h-6 text-red-600" />
      case NotificationType.SURVEY_CREATED:
        return <DocumentPlusIcon className="w-6 h-6 text-blue-600" />
      case NotificationType.BRANCH_ASSIGNED:
        return <BuildingOfficeIcon className="w-6 h-6 text-slate-600" />
      case NotificationType.AUDIT_DUE_SOON:
        return <ClockIcon className="w-6 h-6 text-amber-600" />
      case NotificationType.AUDIT_OVERDUE:
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
      default:
        return <BellIcon className="w-6 h-6 text-gray-500" />
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
    if (!notification.isRead) engine.markAsRead(notification.id)

    // Navigate to relevant page
    if (notification.link) {
      navigate(notification.link)
    } else if (notification.relatedId && notification.requiresAction) {
      // Smart routing based on action type
      if (notification.actionType === 'REVIEW_AUDIT') {
        navigate(`/audit/${notification.relatedId}/review`)
      } else if (notification.actionType === 'FIX_AUDIT') {
        navigate(`/audit/${notification.relatedId}/wizard`)
      }
    }
  }

  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    engine.markAsRead(notificationId)
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

  const unreadCount = engine.unreadCount

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6">
          {/* Header - No heading duplication, unified layout */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <p className="text-base text-gray-500 font-medium">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
                </p>
                <BellIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              
              <button
                onClick={() => engine.markAllAsRead()}
                disabled={unreadCount === 0}
                className="btn btn-outline btn-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Mark all as read</span>
                <span className="sm:hidden">Mark all</span>
              </button>
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
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button onClick={() => engine.loadMore()} disabled={engine.loadingMore} className="btn-outline px-6 py-2 text-sm disabled:opacity-50">
                    {engine.loadingMore ? 'Loading...' : 'Load more'}
                  </button>
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
  getIcon: (type: NotificationType) => React.ReactNode
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAction,
  onMarkAsRead,
  formatTime,
  getIcon,
}) => {
  const { user } = useAuthStore()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
  const needsAction = notification.requiresAction && !notification.actionCompletedAt
  const isOwner = notification.userId === user?.id
  const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(notification.id))
  const canMarkRead = !isDb || isOwner || isAdmin

  return (
    <div
      className={`card p-4 hover:shadow-md transition-all cursor-pointer group ${
        !notification.isRead ? 'bg-blue-50/50 ring-2 ring-blue-100' : ''
      }`}
      onClick={() => onAction(notification)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">{getIcon(notification.type)}</div>

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
                  onClick={(e) => { if (canMarkRead) onMarkAsRead(notification.id, e) }}
                  disabled={!canMarkRead}
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
