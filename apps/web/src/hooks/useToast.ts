import { useToastContext } from '../components/ToastProvider'

export const useToast = () => useToastContext()
export type { ToastOptions } from '../components/ToastProvider'
