import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ErrorStateProps {
  title?: string
  message: string
  retry?: () => void
}

const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = 'Error Loading Data',
  message, 
  retry 
}) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex justify-center mb-4">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-slate-300 mb-6 max-w-md mx-auto">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-white/10 shadow-xs text-sm font-medium rounded-md text-gray-700 dark:text-slate-200 bg-white dark:bg-(--color-card) hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export default ErrorState
