import React from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { Notification, NotificationType, UserRole, Audit, Branch, User } from '@trakr/shared'
import { QK } from '../utils/queryKeys'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { useOrganization } from '../contexts/OrganizationContext'
import { backfillAuditNotifications } from '../utils/backfillNotifications'

export interface NotificationsEngineOptions {
  limit?: number
  refetchIntervalMs?: number
}

export interface NotificationsEngine {
  // core datasets
  unreadNotifications: Notification[]
  allNotifications: Notification[]
  uiNotifications: Notification[]
  dropdownNotifications: Notification[]
  pageNotifications: Notification[]

  // counts
  badgeCount: number
  canMarkAll: boolean
  unreadCount: number

  // actions
  markAsRead: (id: string) => void
  markAllAsRead: () => void

  // helpers
  isUUID: (id: string) => boolean
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  loadingMore: boolean
}

export function useNotificationsEngine(options: NotificationsEngineOptions = {}): NotificationsEngine {
  const { user } = useAuthStore()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const isAdmin = user?.role === UserRole.ADMIN
  const queryClient = useQueryClient()

  const refetchInterval = options.refetchIntervalMs ?? 30000
  const isUUID = React.useCallback((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id), [])
  const pageSize = options.limit ?? 50

  // One-time backfill for admins (RLS safe)
  React.useEffect(() => {
    const hasBackfilled = sessionStorage.getItem('notificationsBackfilled')
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
    if (!hasBackfilled && user?.id && isAdmin) {
      sessionStorage.setItem('notificationsBackfilled', 'true')
      backfillAuditNotifications()
        .then((count) => {
          if (count && count > 0) {
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) })
              queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user.id) })
            }, 500)
          }
        })
        .catch(() => {
          sessionStorage.removeItem('notificationsBackfilled')
        })
    }
  }, [user?.id, queryClient])

  // Fetch UNREAD notifications (DB only)
  const unreadQuery = useQuery<Notification[]>({
    queryKey: QK.UNREAD_NOTIFICATIONS(user?.id),
    queryFn: async () => {
      if (!user?.id) return []
      return await (api as any).getNotifications(user.id, { unreadOnly: true })
    },
    enabled: !!user?.id,
    refetchInterval,
  })

  // Fetch ALL notifications for the current user (server-side pagination)
  const selfInfQuery = useInfiniteQuery<Notification[]>({
    queryKey: ['notifications', user?.id, 'infinite', pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return []
      return await (api as any).getNotifications(user.id, { limit: pageSize, offset: pageParam })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage?.length || 0) < pageSize ? undefined : pages.length * pageSize,
    enabled: !!user?.id,
    refetchInterval,
  })

  // Admin/Super Admin view: fetch all notifications permitted by RLS (server-side pagination)
  const adminInfQuery = useInfiniteQuery<Notification[]>({
    queryKey: ['admin-all-notifications', 'infinite', pageSize, effectiveOrgId || null],
    queryFn: async ({ pageParam = 0 }) => {
      return await (api as any).getAllNotifications({ limit: pageSize, offset: pageParam })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage?.length || 0) < pageSize ? undefined : pages.length * pageSize,
    enabled: !!user?.id && (isSuperAdmin || isAdmin),
    refetchInterval,
  })

  // Org-scoped data for derivation
  const auditsQuery = useQuery<Audit[]>({
    queryKey: ['audits', 'all', effectiveOrgId],
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: !!user?.id && (!!effectiveOrgId || isSuperAdmin),
  })
  const branchesQuery = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => api.getBranches(effectiveOrgId),
    enabled: !!user?.id && (!!effectiveOrgId || isSuperAdmin),
  })
  const usersQuery = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!user?.id && (!!effectiveOrgId || isSuperAdmin),
  })

  const selfUnread = unreadQuery.data || []
  const selfAll = React.useMemo<Notification[]>(() => {
    const pages = selfInfQuery.data?.pages || []
    return (pages.flat() as Notification[])
  }, [selfInfQuery.data])
  const adminAll = React.useMemo<Notification[]>(() => {
    const pages = adminInfQuery.data?.pages || []
    return (pages.flat() as Notification[])
  }, [adminInfQuery.data])
  const audits = auditsQuery.data || []
  const branches = branchesQuery.data || []
  const users = usersQuery.data || []

  // Scope admin view to ALL or ORG (for SA); admins are already scoped by RLS
  const scopedAdminAll = React.useMemo(() => {
    if (!(isSuperAdmin || isAdmin)) return []
    if (isSuperAdmin && !effectiveOrgId) return adminAll // ALL scope
    if (isSuperAdmin && effectiveOrgId) {
      const allowed = new Set((users || []).map(u => (u as any).id))
      return (adminAll || []).filter(n => allowed.has((n as any).userId))
    }
    return adminAll // Admin: RLS returns only same-org rows
  }, [adminAll, isSuperAdmin, isAdmin, effectiveOrgId, users])

  const allNotifications = (isSuperAdmin || isAdmin) ? scopedAdminAll : selfAll
  const unreadNotifications = React.useMemo(() => {
    if (isSuperAdmin || isAdmin) {
      const list = Array.isArray(allNotifications) ? allNotifications : []
      return list.filter(n => !n.isRead || (n.requiresAction && !n.actionCompletedAt))
    }
    return selfUnread
  }, [isSuperAdmin, isAdmin, allNotifications, selfUnread])
  

  // Reconcile actionable REVIEW_AUDIT when audit is no longer SUBMITTED
  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        if (!user?.id) return
        const list = Array.isArray(allNotifications) ? allNotifications : []
        const actionable = list.filter(n => n.requiresAction && !n.actionCompletedAt && n.type === NotificationType.AUDIT_SUBMITTED && !!n.relatedId)
        if (actionable.length === 0) return
        const uniqueIds = Array.from(new Set(actionable.map(n => n.relatedId!)))
        for (const id of uniqueIds) {
          if (cancelled) return
          try {
            const audit = await api.getAuditById(id)
            const status = String(audit?.status || '').toLowerCase()
            if (audit && status && status !== 'submitted') {
              await api.completeNotificationAction(id, 'REVIEW_AUDIT')
              queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) })
              queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user.id) })
            }
          } catch {}
        }
      } catch {}
    }
    run()
    return () => { cancelled = true }
  }, [allNotifications, user?.id, queryClient])

  // Derived candidates based on audits and role
  const derivedCandidates: Notification[] = React.useMemo(() => {
    if (!user) return []
    const list: Notification[] = []
    const role = user.role
    audits.forEach((audit: any) => {
      const branch = branches.find(b => (b as any).id === audit.branchId)
      const branchName = (branch as any)?.name || 'Branch'
      const auditor = users.find(u => (u as any).id === audit.assignedTo)
      const auditorName = (auditor as any)?.name || (auditor as any)?.email || 'Auditor'
      const status = String(audit.status || '').toLowerCase()
      if ((role === UserRole.BRANCH_MANAGER || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) && status === 'submitted') {
        list.push({
          id: `${audit.id}-submitted`,
          userId: user.id,
          type: NotificationType.AUDIT_SUBMITTED,
          title: '✅ Audit Submitted for Approval',
          message: `${auditorName} submitted an audit for ${branchName}`,
          // Managers should land on the review screen to approve/reject
          link: `/audit/${audit.id}/review`,
          isRead: false,
          createdAt: new Date((audit.submittedAt as any) || (audit.updatedAt as any) || (audit.createdAt as any)),
          relatedId: audit.id,
          requiresAction: true,
          actionType: 'REVIEW_AUDIT',
        } as any)
      }
      if (role === UserRole.AUDITOR && audit.assignedTo === user.id && status === 'approved') {
        const approver = users.find(u => (u as any).id === audit.approvedBy)
        list.push({
          id: `${audit.id}-approved`,
          userId: user.id,
          type: NotificationType.AUDIT_APPROVED,
          title: '✅ Audit Approved',
          message: `Your audit for ${branchName} was approved${(approver as any)?.name ? ` by ${(approver as any)?.name}` : ''}`,
          link: `/audits/${audit.id}/summary`,
          isRead: false,
          createdAt: new Date((audit.approvedAt as any) || (audit.updatedAt as any) || (audit.createdAt as any)),
          relatedId: audit.id,
          requiresAction: false,
        } as any)
      }
      if (role === UserRole.AUDITOR && audit.assignedTo === user.id && status === 'rejected') {
        const rejecter = users.find(u => (u as any).id === audit.rejectedBy)
        list.push({
          id: `${audit.id}-rejected`,
          userId: user.id,
          type: NotificationType.AUDIT_REJECTED,
          title: '❌ Audit Rejected',
          message: audit.rejectionNote ? `Your audit for ${branchName} was rejected: ${audit.rejectionNote}` : `Your audit for ${branchName} was rejected${(rejecter as any)?.name ? ` by ${(rejecter as any)?.name}` : ''}`,
          // Auditors should be taken to fix it in the wizard
          link: `/audit/${audit.id}/wizard`,
          isRead: false,
          createdAt: new Date((audit.rejectedAt as any) || (audit.updatedAt as any) || (audit.createdAt as any)),
          relatedId: audit.id,
          requiresAction: true,
          actionType: 'FIX_AUDIT',
        } as any)
      }
    })
    return list.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
  }, [user, audits, branches, users])

  // Derived fallback only when no server notifications exist
  const derivedFallback: Notification[] = React.useMemo(() => {
    const unread = Array.isArray(unreadNotifications) ? unreadNotifications : []
    const all = Array.isArray(allNotifications) ? allNotifications : []
    const hasServer = (unread.length > 0) || (all.length > 0)
    if (hasServer) return []
    return derivedCandidates
  }, [unreadNotifications, allNotifications, derivedCandidates])

  // Shared read-tracking for derived notifications (panel + page stay in sync, per user)
  const derivedReadKey = React.useMemo(
    () => ['notifications', 'derivedRead', user?.id || 'anonymous'] as const,
    [user?.id],
  )
  const derivedReadQuery = useQuery<Set<string>>({
    queryKey: derivedReadKey,
    queryFn: () => {
      const storageKey = `derivedReadNotifications:${user?.id || 'anonymous'}`
      try {
        return new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]'))
      } catch {
        return new Set<string>()
      }
    },
    staleTime: Infinity,
    enabled: true,
  })
  const derivedReadIds = derivedReadQuery.data || new Set<string>()

  const markDerivedAsReadLocal = React.useCallback(
    (id: string) => {
      const storageKey = `derivedReadNotifications:${user?.id || 'anonymous'}`
      queryClient.setQueryData<Set<string>>(derivedReadKey, (prev) => {
        const base = prev || new Set<string>()
        const next = new Set(base)
        next.add(id)
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
        } catch {
          // ignore storage errors
        }
        return next
      })
    },
    [queryClient, derivedReadKey, user?.id],
  )

  // Attention lists
  const dbAttentionList = React.useMemo(() => {
    const list = Array.isArray(allNotifications) ? allNotifications : []
    return list.filter(n => !n.isRead || (n.requiresAction && !n.actionCompletedAt))
  }, [allNotifications])

  const derivedAttentionList = React.useMemo(() => {
    const list = Array.isArray(derivedCandidates) ? derivedCandidates : []
    return list.filter(n => !isUUID(n.id) && !derivedReadIds.has(n.id))
  }, [derivedCandidates, derivedReadIds, isUUID])

  // Base priority order for both panel and page
  const base = React.useMemo(() => {
    if (dbAttentionList.length > 0) return dbAttentionList
    if (derivedAttentionList.length > 0) return derivedAttentionList
    const unread = Array.isArray(unreadNotifications) ? unreadNotifications : []
    if (unread.length > 0) return unread
    if (derivedFallback.length > 0) return derivedFallback
    return (Array.isArray(allNotifications) ? allNotifications : [])
  }, [dbAttentionList, derivedAttentionList, unreadNotifications, allNotifications, derivedFallback])

  // UI list applies local derived read state (used for dropdown / attention view)
  const uiNotifications = React.useMemo(
    () => (Array.isArray(base) ? base : []).map(n => (!isUUID(n.id) && derivedReadIds.has(n.id))
      ? { ...n, isRead: true, readAt: n.readAt || new Date() }
      : n,
    ),
    [base, derivedReadIds, isUUID],
  )

  // Full-page list: keep full history (read + unread). When there are no DB notifications,
  // fall back to derived candidates so /notifications is never empty if there is derived activity.
  const pageNotifications = React.useMemo(() => {
    const dbList = Array.isArray(allNotifications) ? allNotifications : []
    if (dbList.length > 0) return dbList
    const derived = Array.isArray(derivedCandidates) ? derivedCandidates : []
    return derived.map(n => (!isUUID(n.id) && derivedReadIds.has(n.id))
      ? { ...n, isRead: true, readAt: n.readAt || new Date() }
      : n,
    )
  }, [allNotifications, derivedCandidates, derivedReadIds, isUUID])

  // Badge and permissions
  const dbAttentionCount = React.useMemo(() => {
    const list = Array.isArray(allNotifications) ? allNotifications : []
    return list.filter(n => !n.isRead || (n.requiresAction && !n.actionCompletedAt)).length
  }, [allNotifications])
  const ownDbAttentionCount = React.useMemo(() => {
    const list = Array.isArray(selfAll) ? selfAll : []
    return list.filter(n => !n.isRead || (n.requiresAction && !n.actionCompletedAt)).length
  }, [selfAll])
  const derivedBadgeCount = React.useMemo(() => {
    if (dbAttentionCount > 0) return 0
    const list = Array.isArray(derivedCandidates) ? derivedCandidates : []
    return list.filter(n => !n.isRead && !isUUID(n.id) && !derivedReadIds.has(n.id)).length
  }, [dbAttentionCount, derivedCandidates, derivedReadIds, isUUID])
  const badgeCount = dbAttentionCount > 0 ? dbAttentionCount : derivedBadgeCount
  const canMarkAll = ownDbAttentionCount > 0 || derivedBadgeCount > 0

  // Actions
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => {
      const isDb = isUUID(notificationId)
      if (!isDb) return Promise.resolve()
      return api.markNotificationAsRead(notificationId)
    },
    onMutate: async (notificationId: string) => {
      const unreadKey = QK.UNREAD_NOTIFICATIONS(user?.id)
      const selfInfKey = ['notifications', user?.id, 'infinite', pageSize]
      const adminInfKey = ['admin-all-notifications', 'infinite', pageSize, effectiveOrgId || null]
      await queryClient.cancelQueries({ queryKey: unreadKey })
      await queryClient.cancelQueries({ queryKey: selfInfKey })
      await queryClient.cancelQueries({ queryKey: adminInfKey })
      const prevUnread = queryClient.getQueryData<Notification[]>(unreadKey)
      const prevSelfInf = queryClient.getQueryData<InfiniteData<Notification[]>>(selfInfKey)
      const prevAdminInf = queryClient.getQueryData<InfiniteData<Notification[]>>(adminInfKey)
      queryClient.setQueryData<Notification[]>(unreadKey, (old) => old?.filter(n => n.id !== notificationId) || [])
      // patch infinite caches
      const patch = (old?: InfiniteData<Notification[]>) => old ? { ...old, pages: old.pages.map(p => p.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n)) } : old
      queryClient.setQueryData<InfiniteData<Notification[]>>(selfInfKey, (old) => patch(old))
      queryClient.setQueryData<InfiniteData<Notification[]>>(adminInfKey, (old) => patch(old))
      return { prevUnread, unreadKey, prevSelfInf, selfInfKey, prevAdminInf, adminInfKey }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevUnread) queryClient.setQueryData(ctx.unreadKey, ctx.prevUnread)
      if (ctx?.prevSelfInf) queryClient.setQueryData(ctx.selfInfKey, ctx.prevSelfInf)
      if (ctx?.prevAdminInf) queryClient.setQueryData(ctx.adminInfKey, ctx.prevAdminInf)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id, 'infinite'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-notifications', 'infinite'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('No user ID')
      return api.markAllNotificationsAsRead(user.id)
    },
    onMutate: async () => {
      const unreadKey = QK.UNREAD_NOTIFICATIONS(user?.id)
      const selfInfKey = ['notifications', user?.id, 'infinite', pageSize]
      const adminInfKey = ['admin-all-notifications', 'infinite', pageSize, effectiveOrgId || null]
      await queryClient.cancelQueries({ queryKey: unreadKey })
      await queryClient.cancelQueries({ queryKey: selfInfKey })
      await queryClient.cancelQueries({ queryKey: adminInfKey })
      const prevUnread = queryClient.getQueryData<Notification[]>(unreadKey)
      const prevSelfInf = queryClient.getQueryData<InfiniteData<Notification[]>>(selfInfKey)
      const prevAdminInf = queryClient.getQueryData<InfiniteData<Notification[]>>(adminInfKey)
      try {
        const storageKey = `derivedReadNotifications:${user?.id || 'anonymous'}`
        queryClient.setQueryData<Set<string>>(derivedReadKey, (prevSet) => {
          const base = prevSet || new Set<string>()
          const next = new Set(base)
          const curr = Array.isArray(uiNotifications) ? uiNotifications : []
          curr.forEach(n => { if (!isUUID(n.id)) next.add(n.id) })
          try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
          } catch {
            // ignore storage errors
          }
          return next
        })
      } catch {}
      queryClient.setQueryData<Notification[]>(unreadKey, () => [])
      const patchAll = (old?: InfiniteData<Notification[]>) => old ? { ...old, pages: old.pages.map(p => p.map(n => ({ ...n, isRead: true, readAt: new Date() }))) } : old
      queryClient.setQueryData<InfiniteData<Notification[]>>(selfInfKey, (old) => patchAll(old))
      queryClient.setQueryData<InfiniteData<Notification[]>>(adminInfKey, (old) => patchAll(old))
      return { prevUnread, unreadKey, prevSelfInf, selfInfKey, prevAdminInf, adminInfKey }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevUnread) queryClient.setQueryData(ctx.unreadKey, ctx.prevUnread)
      if (ctx?.prevSelfInf) queryClient.setQueryData(ctx.selfInfKey, ctx.prevSelfInf)
      if (ctx?.prevAdminInf) queryClient.setQueryData(ctx.adminInfKey, ctx.prevAdminInf)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(user?.id) })
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id, 'infinite'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-notifications', 'infinite'] })
    },
  })

  const dropdownNotifications = React.useMemo(() => uiNotifications.slice(0, options.limit ?? 10), [uiNotifications, options.limit])
  const unreadCount = React.useMemo(() => uiNotifications.filter(n => !n.isRead).length, [uiNotifications])

  const loading = !!(unreadQuery.isLoading || selfInfQuery.isLoading || (isSuperAdmin || isAdmin ? adminInfQuery.isLoading : false) || auditsQuery.isLoading || branchesQuery.isLoading || usersQuery.isLoading)
  const hasMore = (isSuperAdmin || isAdmin) ? !!adminInfQuery.hasNextPage : !!selfInfQuery.hasNextPage
  const loadingMore = (isSuperAdmin || isAdmin) ? !!adminInfQuery.isFetchingNextPage : !!selfInfQuery.isFetchingNextPage
  const loadMore = React.useCallback(() => {
    if (isSuperAdmin || isAdmin) {
      if (adminInfQuery.hasNextPage) adminInfQuery.fetchNextPage()
    } else {
      if (selfInfQuery.hasNextPage) selfInfQuery.fetchNextPage()
    }
  }, [isSuperAdmin, isAdmin, adminInfQuery.hasNextPage, selfInfQuery.hasNextPage])

  return {
    unreadNotifications,
    allNotifications,
    uiNotifications,
    dropdownNotifications,
    pageNotifications,
    badgeCount,
    canMarkAll,
    unreadCount,
    markAsRead: (id: string) => {
      if (isUUID(id)) {
        // DB-backed notification: mark as read server-side and update caches
        markAsReadMutation.mutate(id)
      } else {
        // Derived notification: track read state locally per user
        markDerivedAsReadLocal(id)
      }
    },
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    isUUID,
    loading,
    hasMore,
    loadMore,
    loadingMore,
  }
}
