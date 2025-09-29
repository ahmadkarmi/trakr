interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'gray'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

const colorClasses = {
  primary: 'text-primary-600',
  white: 'text-white',
  gray: 'text-gray-400'
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '',
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-2">
        <svg
          className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {text && (
          <span className={`text-sm ${colorClasses[color]}`}>
            {text}
          </span>
        )}
      </div>
    </div>
  )
}

// Overlay spinner for full-screen loading
export function LoadingOverlay({ 
  text = 'Loading...', 
  className = '' 
}: { 
  text?: string
  className?: string 
}) {
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 font-medium">{text}</p>
      </div>
    </div>
  )
}

// Inline loading state
export function InlineLoading({ 
  text = 'Loading...', 
  className = '' 
}: { 
  text?: string
  className?: string 
}) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">{text}</p>
      </div>
    </div>
  )
}

// Button loading state
export function ButtonLoading({ 
  size = 'sm', 
  color = 'white' 
}: { 
  size?: 'sm' | 'md'
  color?: 'primary' | 'white' | 'gray' 
}) {
  return <LoadingSpinner size={size} color={color} />
}

// Dots loading animation
export function DotsLoading({ 
  color = 'primary', 
  className = '' 
}: { 
  color?: 'primary' | 'white' | 'gray'
  className?: string 
}) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${colorClasses[color]} animate-bounce`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}

// Progress bar loading
export function ProgressLoading({ 
  progress = 0, 
  className = '',
  showPercentage = false 
}: { 
  progress?: number
  className?: string
  showPercentage?: boolean 
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">Loading...</span>
        {showPercentage && (
          <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}
