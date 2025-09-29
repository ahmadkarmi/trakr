import { useState, useEffect, useCallback } from 'react'
import { offlineStorage, OfflineAudit } from '../utils/offlineStorage'
import { useErrorHandler } from './useErrorHandler'

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: Date | null
  syncProgress: number
}

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncProgress: 0
  })
  
  const { handleError } = useErrorHandler()

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }))
      // Trigger sync when coming back online
      syncPendingData()
    }

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load pending count on mount
  useEffect(() => {
    loadPendingCount()
  }, [])

  const loadPendingCount = useCallback(async () => {
    try {
      const pendingAudits = await offlineStorage.getPendingSyncAudits()
      const pendingPhotos = await offlineStorage.getPendingPhotos()
      const syncQueue = await offlineStorage.getSyncQueue()
      
      setSyncStatus(prev => ({
        ...prev,
        pendingCount: pendingAudits.length + pendingPhotos.length + syncQueue.length
      }))
    } catch (error) {
      handleError(error, { context: 'loadPendingCount' })
    }
  }, [handleError])

  const saveAuditOffline = useCallback(async (audit: Partial<OfflineAudit>) => {
    try {
      const offlineAudit: OfflineAudit = {
        id: audit.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        surveyId: audit.surveyId || '',
        branchId: audit.branchId || '',
        userId: audit.userId || '',
        status: 'pending_sync',
        responses: audit.responses || {},
        photos: audit.photos || [],
        createdAt: audit.createdAt || new Date(),
        updatedAt: new Date(),
        syncAttempts: 0
      }

      await offlineStorage.saveAudit(offlineAudit)
      
      // Add to sync queue
      await offlineStorage.addToSyncQueue({
        id: `audit_${offlineAudit.id}`,
        type: 'audit',
        data: offlineAudit,
        priority: 1,
        createdAt: new Date()
      })

      await loadPendingCount()
      
      // Register for background sync if available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('audit-sync')
      }

      return offlineAudit
    } catch (error) {
      handleError(error, { context: 'saveAuditOffline' })
      throw error
    }
  }, [handleError, loadPendingCount])

  const syncPendingData = useCallback(async () => {
    if (!syncStatus.isOnline || syncStatus.isSyncing) {
      return
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }))

    try {
      const syncQueue = await offlineStorage.getSyncQueue()
      const totalItems = syncQueue.length

      if (totalItems === 0) {
        setSyncStatus(prev => ({ 
          ...prev, 
          isSyncing: false, 
          syncProgress: 100,
          lastSyncTime: new Date() 
        }))
        return
      }

      let completedItems = 0

      for (const item of syncQueue) {
        try {
          if (item.type === 'audit') {
            await syncAudit(item.data)
          } else if (item.type === 'photo') {
            await syncPhoto(item.data)
          }

          await offlineStorage.removeFromSyncQueue(item.id)
          completedItems++

          setSyncStatus(prev => ({
            ...prev,
            syncProgress: Math.round((completedItems / totalItems) * 100)
          }))
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error)
          // Continue with other items even if one fails
        }
      }

      await loadPendingCount()
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 100,
        lastSyncTime: new Date()
      }))

    } catch (error) {
      handleError(error, { context: 'syncPendingData' })
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, handleError, loadPendingCount])

  const syncAudit = async (audit: OfflineAudit) => {
    // This would integrate with your actual API
    const response = await fetch('/api/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        survey_id: audit.surveyId,
        branch_id: audit.branchId,
        user_id: audit.userId,
        responses: audit.responses,
        created_at: audit.createdAt,
        updated_at: audit.updatedAt
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to sync audit: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Update local audit with server ID if needed
    if (result.id && result.id !== audit.id) {
      await offlineStorage.deleteAudit(audit.id)
      audit.id = result.id
      audit.status = 'draft' // Reset status after successful sync
      await offlineStorage.saveAudit(audit)
    }

    return result
  }

  const syncPhoto = async (photo: any) => {
    const formData = new FormData()
    formData.append('file', photo.file)
    formData.append('audit_id', photo.auditId)
    formData.append('question_id', photo.questionId)

    const response = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Failed to sync photo: ${response.statusText}`)
    }

    await offlineStorage.markPhotoUploaded(photo.id)
    return await response.json()
  }

  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clearAllData()
      await loadPendingCount()
      setSyncStatus(prev => ({ ...prev, lastSyncTime: new Date() }))
    } catch (error) {
      handleError(error, { context: 'clearOfflineData' })
    }
  }, [handleError, loadPendingCount])

  const getStorageUsage = useCallback(async () => {
    try {
      return await offlineStorage.getStorageUsage()
    } catch (error) {
      handleError(error, { context: 'getStorageUsage' })
      return { used: 0, quota: 0 }
    }
  }, [handleError])

  return {
    syncStatus,
    saveAuditOffline,
    syncPendingData,
    clearOfflineData,
    getStorageUsage,
    loadPendingCount
  }
}

// Hook for offline-first audit operations
export function useOfflineAudit() {
  const { saveAuditOffline, syncStatus } = useOfflineSync()
  const { handleError } = useErrorHandler()

  const saveAudit = useCallback(async (auditData: Partial<OfflineAudit>) => {
    try {
      if (syncStatus.isOnline) {
        // Try to save online first
        try {
          const response = await fetch('/api/audits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auditData)
          })

          if (response.ok) {
            return await response.json()
          }
        } catch (error) {
          console.warn('Online save failed, falling back to offline:', error)
        }
      }

      // Save offline
      return await saveAuditOffline(auditData)
    } catch (error) {
      handleError(error, { context: 'saveAudit' })
      throw error
    }
  }, [saveAuditOffline, syncStatus.isOnline, handleError])

  const getAudits = useCallback(async (userId?: string) => {
    try {
      if (syncStatus.isOnline) {
        // Try to get from server first
        try {
          const url = userId ? `/api/audits?user_id=${userId}` : '/api/audits'
          const response = await fetch(url)
          
          if (response.ok) {
            return await response.json()
          }
        } catch (error) {
          console.warn('Online fetch failed, falling back to offline:', error)
        }
      }

      // Get from offline storage
      return await offlineStorage.getAllAudits(userId)
    } catch (error) {
      handleError(error, { context: 'getAudits' })
      return []
    }
  }, [syncStatus.isOnline, handleError])

  return {
    saveAudit,
    getAudits,
    isOffline: !syncStatus.isOnline
  }
}
