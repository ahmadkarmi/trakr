// IndexedDB wrapper for offline storage
export interface OfflineAudit {
  id: string
  surveyId: string
  branchId: string
  userId: string
  status: 'draft' | 'pending_sync'
  responses: Record<string, any>
  photos: OfflinePhoto[]
  createdAt: Date
  updatedAt: Date
  syncAttempts: number
}

export interface OfflinePhoto {
  id: string
  auditId: string
  questionId: string
  file: File
  localUrl: string
  uploaded: boolean
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'TrakrOfflineDB'
  private readonly DB_VERSION = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Audits store
        if (!db.objectStoreNames.contains('audits')) {
          const auditStore = db.createObjectStore('audits', { keyPath: 'id' })
          auditStore.createIndex('status', 'status', { unique: false })
          auditStore.createIndex('userId', 'userId', { unique: false })
          auditStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' })
          photoStore.createIndex('auditId', 'auditId', { unique: false })
          photoStore.createIndex('uploaded', 'uploaded', { unique: false })
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
          syncStore.createIndex('type', 'type', { unique: false })
          syncStore.createIndex('priority', 'priority', { unique: false })
        }
      }
    })
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return this.db
  }

  // Audit operations
  async saveAudit(audit: OfflineAudit): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['audits'], 'readwrite')
    const store = transaction.objectStore('audits')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(audit)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getAudit(id: string): Promise<OfflineAudit | null> {
    const db = this.ensureDB()
    const transaction = db.transaction(['audits'], 'readonly')
    const store = transaction.objectStore('audits')
    
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllAudits(userId?: string): Promise<OfflineAudit[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['audits'], 'readonly')
    const store = transaction.objectStore('audits')
    
    return new Promise((resolve, reject) => {
      const request = userId 
        ? store.index('userId').getAll(userId)
        : store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingSyncAudits(): Promise<OfflineAudit[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['audits'], 'readonly')
    const store = transaction.objectStore('audits')
    
    return new Promise((resolve, reject) => {
      const request = store.index('status').getAll('pending_sync')
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async deleteAudit(id: string): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['audits'], 'readwrite')
    const store = transaction.objectStore('audits')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Photo operations
  async savePhoto(photo: OfflinePhoto): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['photos'], 'readwrite')
    const store = transaction.objectStore('photos')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(photo)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getPhotosForAudit(auditId: string): Promise<OfflinePhoto[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['photos'], 'readonly')
    const store = transaction.objectStore('photos')
    
    return new Promise((resolve, reject) => {
      const request = store.index('auditId').getAll(auditId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingPhotos(): Promise<OfflinePhoto[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['photos'], 'readonly')
    const store = transaction.objectStore('photos')
    
    return new Promise((resolve, reject) => {
      const request = store.index('uploaded').getAll(false)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async markPhotoUploaded(photoId: string): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['photos'], 'readwrite')
    const store = transaction.objectStore('photos')
    
    const photo = await new Promise<OfflinePhoto>((resolve, reject) => {
      const request = store.get(photoId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (photo) {
      photo.uploaded = true
      await new Promise<void>((resolve, reject) => {
        const request = store.put(photo)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }

  // Sync queue operations
  async addToSyncQueue(item: {
    id: string
    type: 'audit' | 'photo'
    data: any
    priority: number
    createdAt: Date
  }): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncQueue(): Promise<any[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['syncQueue'], 'readonly')
    const store = transaction.objectStore('syncQueue')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const items = request.result || []
        // Sort by priority (higher first) then by creation date
        items.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Utility methods
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      }
    }
    return { used: 0, quota: 0 }
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['audits', 'photos', 'syncQueue'], 'readwrite')
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('audits').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('photos').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('syncQueue').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    ])
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorageManager()

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineStorage.init().catch(console.error)
}
