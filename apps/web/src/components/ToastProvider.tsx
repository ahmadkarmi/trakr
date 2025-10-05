import React from 'react'

export type ToastOptions = {
  message: string
  actionLabel?: string
  onAction?: () => void
  duration?: number
  variant?: 'info' | 'success' | 'error'
}

export type ToastItem = ToastOptions & { id: string }

type ToastContextType = {
  showToast: (opts: ToastOptions) => string
  dismissToast: (id: string) => void
  dismissAll: () => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export const useToastContext = () => {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const timersRef = React.useRef<Record<string, number>>({})

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const t = timersRef.current[id]
    if (t) {
      window.clearTimeout(t)
      delete timersRef.current[id]
    }
  }, [])

  const showToast = React.useCallback((opts: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const item: ToastItem = { id, duration: 6000, variant: 'info', ...opts }
    setToasts(prev => [...prev, item])
    const timer = window.setTimeout(() => dismissToast(id), item.duration)
    timersRef.current[id] = timer
    return id
  }, [dismissToast])

  const dismissAll = React.useCallback(() => {
    Object.keys(timersRef.current).forEach((id) => window.clearTimeout(timersRef.current[id]))
    timersRef.current = {}
    setToasts([])
  }, [])

  // Listen for global toast events emitted by toastBus
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ToastOptions>
      if (ce.detail) showToast(ce.detail)
    }
    window.addEventListener('app-toast', handler as EventListener)
    return () => window.removeEventListener('app-toast', handler as EventListener)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, dismissAll }}>
      {children}
      {/* Mobile-Optimized Toast Container */}
      <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 px-4 pb-4 sm:px-0 sm:pb-0 space-y-2 max-w-full sm:max-w-md pointer-events-none">
        {toasts.map(t => {
          const bgColor = t.variant === 'success' 
            ? 'bg-green-600' 
            : t.variant === 'error' 
            ? 'bg-red-600' 
            : 'bg-gray-900'
          
          const icon = t.variant === 'success'
            ? '✓'
            : t.variant === 'error'
            ? '!'
            : 'ℹ'
          
          return (
            <div 
              key={t.id} 
              className={`${bgColor} rounded-xl sm:rounded-lg shadow-xl backdrop-blur-sm text-white animate-slide-up pointer-events-auto`}
              style={{
                animation: 'slideUp 0.3s ease-out'
              }}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  t.variant === 'success' ? 'bg-green-700' : t.variant === 'error' ? 'bg-red-700' : 'bg-gray-800'
                }`}>
                  {icon}
                </div>
                
                {/* Message */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium leading-relaxed">{t.message}</p>
                </div>
                
                {/* Close Button */}
                <button 
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors touch-target"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Action Button Row */}
              {t.onAction && t.actionLabel && (
                <div className="px-4 pb-4 pt-0">
                  <button
                    className="w-full sm:w-auto btn btn-sm bg-white/20 hover:bg-white/30 text-white border-white/40 rounded-lg font-medium touch-target"
                    onClick={() => { t.onAction && t.onAction(); dismissToast(t.id) }}
                  >
                    {t.actionLabel}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
