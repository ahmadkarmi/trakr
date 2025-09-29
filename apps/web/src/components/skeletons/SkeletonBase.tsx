import { ReactNode } from 'react'

interface SkeletonBaseProps {
  className?: string
  children?: ReactNode
  animate?: boolean
}

export function SkeletonBase({ className = '', animate = true, children }: SkeletonBaseProps) {
  const baseClasses = `bg-gray-200 rounded ${animate ? 'animate-pulse' : ''}`
  
  return (
    <div className={`${baseClasses} ${className}`}>
      {children}
    </div>
  )
}

// Common skeleton shapes
export function SkeletonText({ 
  lines = 1, 
  className = '', 
  lastLineWidth = '75%' 
}: { 
  lines?: number
  className?: string
  lastLineWidth?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBase
          key={i}
          className={`h-4 ${
            i === lines - 1 && lines > 1 
              ? `w-[${lastLineWidth}]` 
              : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 'w-10 h-10', className = '' }: { size?: string, className?: string }) {
  return <SkeletonBase className={`${size} rounded-full ${className}`} />
}

export function SkeletonButton({ className = '' }: { className?: string }) {
  return <SkeletonBase className={`h-10 w-24 rounded-lg ${className}`} />
}

export function SkeletonCard({ className = '', children }: { className?: string, children?: ReactNode }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {children}
    </div>
  )
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonBase key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <SkeletonBase key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonImage({ 
  aspectRatio = 'aspect-video', 
  className = '' 
}: { 
  aspectRatio?: string
  className?: string 
}) {
  return <SkeletonBase className={`w-full ${aspectRatio} ${className}`} />
}
