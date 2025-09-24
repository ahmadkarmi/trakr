import React from 'react'
import Modal from './Modal'

type Props = {
  open: boolean
  title: string
  children?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  disabled?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const ConfirmationModal: React.FC<Props> = ({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      primaryAction={{ label: loading ? 'Please wait…' : confirmLabel, onClick: onConfirm, disabled: disabled || loading }}
      secondaryAction={{ label: cancelLabel, onClick: onCancel, disabled: loading }}
    >
      {children}
    </Modal>
  )
}

export default ConfirmationModal
