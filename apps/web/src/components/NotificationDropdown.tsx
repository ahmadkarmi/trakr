import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Notification, NotificationType } from '@trakr/shared'
import { BellIcon, XMarkIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, DocumentPlusIcon, BuildingOfficeIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { useNotificationsEngine } from '../notifications/useNotifications'

const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate()
  const engine = useNotificationsEngine({ limit: 10, refetchIntervalMs: 30000 })
  const badgeCount = engine.badgeCount
  const canMarkAll = engine.canMarkAll
  const dropdownNotifications = engine.dropdownNotifications
  const [isOpen, setIsOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState(0)
  const [touchEnd, setTouchEnd] = React.useState(0)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Detect mobile viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])



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
      engine.markAsRead(notification.id)
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

  const getNotificationIcon = (type: NotificationType): React.ReactNode => {
    switch (type) {
      case NotificationType.AUDIT_SUBMITTED:
        return <ClipboardDocumentCheckIcon className="w-5 h-5 text-indigo-600" />
      case NotificationType.AUDIT_APPROVED:
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case NotificationType.AUDIT_REJECTED:
        return <XCircleIcon className="w-5 h-5 text-red-600" />
      case NotificationType.SURVEY_CREATED:
        return <DocumentPlusIcon className="w-5 h-5 text-blue-600" />
      case NotificationType.BRANCH_ASSIGNED:
        return <BuildingOfficeIcon className="w-5 h-5 text-slate-600" />
      case NotificationType.AUDIT_DUE_SOON:
        return <ClockIcon className="w-5 h-5 text-amber-600" />
      case NotificationType.AUDIT_OVERDUE:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />
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
      <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setIsOpen(v => !v)}
          className="relative inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <BellIcon className="w-6 h-6 text-gray-700" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] leading-4 text-center">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>

        {/* Desktop Dropdown */}
        {isOpen && !isMobile && (
          <div className="absolute right-0 mt-2 w-[380px] max-h-[80vh] z-[101]">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => engine.markAllAsRead()}
                    disabled={!canMarkAll}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                {dropdownNotifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <BellIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">All caught up!</h3>
                    <p className="text-gray-500 text-sm">We'll notify you when there's something new</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {dropdownNotifications.map(notification => {
                      const needsAction = notification.requiresAction && !notification.actionCompletedAt
                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 mt-0.5 w-6 h-6 flex justify-center items-center rounded-full bg-gray-100">
                              {getNotificationIcon(notification.type)}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                                {needsAction && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20">Action Required</span>
                                )}
                                {!notification.isRead && !needsAction && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20">New</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {formatTime(notification.createdAt)}
                                </span>
                                {needsAction && (
                                  <span className="text-xs text-primary-700 font-medium">Review</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                {dropdownNotifications.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <button onClick={() => { navigate('/notifications'); setIsOpen(false) }} className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</button>
                    <button onClick={() => { navigate('/settings'); setIsOpen(false) }} className="text-xs text-gray-500 hover:text-gray-700">Preferences</button>
                  </div>
                ) : (
                  <div className="text-center">
                    <button onClick={() => { navigate('/settings'); setIsOpen(false) }} className="text-xs text-gray-500 hover:text-gray-700">Notification Preferences</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {isOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-[100] md:hidden" onClick={() => setIsOpen(false)} />

          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[101] md:hidden animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
              {/* Handle Bar & Header - Swipeable Area */}
              <div className="touch-none select-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {/* Handle Bar */}
                <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); engine.markAllAsRead() }} disabled={!canMarkAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400">Mark all read</button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
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
                        <div key={notification.id} className={`px-4 py-4 active:bg-gray-100 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''}`} onClick={() => handleNotificationClick(notification)}>
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 mt-0.5 w-6 h-6 flex justify-center items-center rounded-full bg-gray-100">{getNotificationIcon(notification.type)}</div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h4 className="text-base font-semibold text-gray-900">{notification.title}</h4>
                                {needsAction && (<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20">Action Required</span>)}
                                {!notification.isRead && !needsAction && (<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20">New</span>)}
                              </div>
                              <p className="text-sm text-gray-600 mb-3 leading-relaxed">{notification.message}</p>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-gray-500 flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />{formatTime(notification.createdAt)}</span>
                                {needsAction && (<button onClick={(e) => { e.stopPropagation(); handleNotificationClick(notification) }} className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">Review Now</button>)}
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
                    <button onClick={() => { navigate('/notifications'); setIsOpen(false) }} className="w-full py-2.5 text-sm text-primary-600 hover:text-primary-700 font-semibold">View all notifications</button>
                    <button onClick={() => { navigate('/settings'); setIsOpen(false) }} className="w-full py-2 text-xs text-gray-500 hover:text-gray-700">Notification Preferences</button>
                  </div>
                ) : (
                  <button onClick={() => { navigate('/settings'); setIsOpen(false) }} className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700">Notification Preferences</button>
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
