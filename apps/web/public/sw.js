const CACHE_NAME = 'trakr-v1'
const STATIC_CACHE = 'trakr-static-v1'
const DYNAMIC_CACHE = 'trakr-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  // Add your main CSS and JS files here when built
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/organizations/,
  /\/api\/users/,
  /\/api\/branches/,
  /\/api\/zones/,
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  event.respondWith(
    handleFetch(request)
  )
})

async function handleFetch(request) {
  const url = new URL(request.url)
  
  try {
    // Strategy 1: Static assets - Cache First
    if (STATIC_ASSETS.some(asset => url.pathname === asset) || 
        url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
      return await cacheFirst(request, STATIC_CACHE)
    }

    // Strategy 2: API calls - Network First with cache fallback
    if (url.pathname.startsWith('/api/') || 
        API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirst(request, DYNAMIC_CACHE)
    }

    // Strategy 3: Pages - Network First
    if (url.pathname.startsWith('/') && request.headers.get('accept')?.includes('text/html')) {
      return await networkFirst(request, DYNAMIC_CACHE)
    }

    // Default: Network only
    return await fetch(request)
    
  } catch (error) {
    console.error('[SW] Fetch failed:', error)
    
    // Fallback for HTML pages when offline
    if (request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(STATIC_CACHE)
      const cachedResponse = await cache.match('/')
      if (cachedResponse) {
        return cachedResponse
      }
    }
    
    throw error
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url)
    return cachedResponse
  }
  
  console.log('[SW] Cache miss, fetching:', request.url)
  const networkResponse = await fetch(request)
  
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone())
  }
  
  return networkResponse
}

// Network First strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  
  try {
    console.log('[SW] Network first:', request.url)
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Cache fallback hit:', request.url)
      return cachedResponse
    }
    
    throw error
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'audit-sync') {
    event.waitUntil(syncAudits())
  }
})

async function syncAudits() {
  try {
    // Get pending audit data from IndexedDB
    // Sync with server when online
    console.log('[SW] Syncing pending audits...')
    // Implementation would go here
  } catch (error) {
    console.error('[SW] Audit sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'view') {
    const url = event.notification.data?.url || '/'
    event.waitUntil(
      self.clients.openWindow(url)
    )
  }
})
