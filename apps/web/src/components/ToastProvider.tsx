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
      {/* Container */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-2.5 rounded shadow-lg text-white ${t.variant === 'success' ? 'bg-green-700' : t.variant === 'error' ? 'bg-red-700' : 'bg-gray-900'}`}>
            <span className="text-sm">{t.message}</span>
            {t.onAction && t.actionLabel && (
              <button
                className="btn-outline btn-xs bg-white/10 hover:bg-white/20 text-white border-white/30"
                onClick={() => { t.onAction && t.onAction(); dismissToast(t.id) }}
              >
                {t.actionLabel}
              </button>
            )}
            <button className="btn-ghost btn-xs text-white/80 hover:text-white" onClick={() => dismissToast(t.id)}>Dismiss</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
