import React from 'react'
import { createPortal } from 'react-dom'

export type ModalAction = {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children?: React.ReactNode
  primaryAction?: ModalAction
  secondaryAction?: ModalAction
  initialFocusRef?: React.RefObject<HTMLElement>
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, primaryAction, secondaryAction, initialFocusRef }) => {
  const overlayRef = React.useRef<HTMLDivElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  React.useEffect(() => {
    if (!open) return
    // Trap focus within the modal content
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const container = contentRef.current
      if (!container) return
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const prevActive = document.activeElement as HTMLElement | null
    const toFocus = initialFocusRef?.current || contentRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement | null
    toFocus?.focus()
    // Hide background from screen readers while modal is open
    const appRoot = document.getElementById('root')
    if (appRoot) appRoot.setAttribute('aria-hidden', 'true')
    return () => {
      prevActive?.focus?.()
      if (appRoot) appRoot.removeAttribute('aria-hidden')
    }
  }, [open, initialFocusRef])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined} data-focus-trap>
      <div ref={overlayRef} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={contentRef} className="relative bg-white rounded-lg shadow-xl w-[92vw] max-w-xl mx-auto p-5">
        {title && <h3 className="text-lg font-semibold mb-2" id="modal-title">{title}</h3>}
        <div className="space-y-3">
          {children}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="mt-4 flex justify-end gap-2">
            {secondaryAction && (
              <button
                className="btn-ghost"
                disabled={!!secondaryAction.disabled}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                className="btn-primary"
                disabled={!!primaryAction.disabled}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Modal
