import { useState, useEffect } from 'react'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { LoadingSpinner } from './LoadingSpinner'

export function OfflineStatus() {
  const { syncStatus, syncPendingData, getStorageUsage } = useOfflineSync()
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 })
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const loadStorageUsage = async () => {
      const usage = await getStorageUsage()
      setStorageUsage(usage)
    }
    
    loadStorageUsage()
    const interval = setInterval(loadStorageUsage, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [getStorageUsage])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-500'
    if (syncStatus.isSyncing) return 'bg-yellow-500'
    if (syncStatus.pendingCount > 0) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline'
    if (syncStatus.isSyncing) return 'Syncing...'
    if (syncStatus.pendingCount > 0) return `${syncStatus.pendingCount} pending`
    return 'Online'
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-2 bg-white rounded-lg shadow-md border border-gray-200 px-3 py-2 text-sm hover:shadow-lg transition-shadow"
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-gray-700">{getStatusText()}</span>
          {syncStatus.isSyncing && (
            <LoadingSpinner size="sm" />
          )}
        </button>

        {showDetails && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="space-y-4">
              {/* Connection Status */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Connection Status</h4>
                <div className="flex items-center justify-between text-sm">
                  <span>Status:</span>
                  <span className={`font-medium ${syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {syncStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                {syncStatus.lastSyncTime && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span>Last sync:</span>
                    <span className="text-gray-600">
                      {syncStatus.lastSyncTime.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Sync Status */}
              {(syncStatus.pendingCount > 0 || syncStatus.isSyncing) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sync Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Pending items:</span>
                      <span className="font-medium text-orange-600">
                        {syncStatus.pendingCount}
                      </span>
                    </div>
                    
                    {syncStatus.isSyncing && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress:</span>
                          <span className="font-medium text-blue-600">
                            {syncStatus.syncProgress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${syncStatus.syncProgress}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Storage Usage */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Storage Usage</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Used:</span>
                    <span className="font-medium">{formatBytes(storageUsage.used)}</span>
                  </div>
                  {storageUsage.quota > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Available:</span>
                        <span className="font-medium">{formatBytes(storageUsage.quota)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-gray-600 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min(100, (storageUsage.used / storageUsage.quota) * 100)}%` 
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-gray-200">
                {syncStatus.isOnline && syncStatus.pendingCount > 0 && (
                  <button
                    onClick={() => {
                      syncPendingData()
                      setShowDetails(false)
                    }}
                    disabled={syncStatus.isSyncing}
                    className="w-full bg-primary-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                )}
                
                {!syncStatus.isOnline && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      You're offline. Changes will sync when connection is restored.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple offline banner for when user goes offline
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
          <p className="text-sm text-yellow-800">
            You're offline. Some features may be limited, but you can continue working.
          </p>
        </div>
      </div>
    </div>
  )
}
