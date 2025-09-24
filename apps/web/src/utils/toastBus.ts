import type { ToastOptions } from '@/components/ToastProvider'

export function emitToast(opts: ToastOptions) {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: opts }))
  }
}
