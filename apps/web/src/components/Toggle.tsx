import { Switch } from '@headlessui/react'
import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`${checked ? 'bg-primary-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </Switch>
  )
}
