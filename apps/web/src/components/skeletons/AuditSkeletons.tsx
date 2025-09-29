import { SkeletonBase, SkeletonText, SkeletonCircle, SkeletonCard, SkeletonButton, SkeletonImage } from './SkeletonBase'

export function AuditListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Audit Title */}
              <SkeletonBase className="h-6 w-3/4 mb-3" />
              
              {/* Audit Details */}
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <SkeletonBase className="h-4 w-24" />
                  <SkeletonBase className="h-4 w-32" />
                </div>
                <div className="flex items-center space-x-4">
                  <SkeletonBase className="h-4 w-20" />
                  <SkeletonBase className="h-4 w-28" />
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <SkeletonBase className="h-6 w-20 rounded-full" />
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <SkeletonBase className="h-2 w-full rounded-full" />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mt-4">
            <SkeletonButton className="w-20" />
            <SkeletonButton className="w-24" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  )
}

export function AuditFormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <SkeletonBase className="h-8 w-64 mx-auto" />
        <SkeletonBase className="h-4 w-48 mx-auto" />
      </div>
      
      {/* Form Fields */}
      <SkeletonCard className="space-y-6">
        {/* Question 1 */}
        <div>
          <SkeletonBase className="h-5 w-3/4 mb-3" />
          <div className="space-y-2">
            <SkeletonBase className="h-10 w-full rounded-lg" />
          </div>
        </div>
        
        {/* Question 2 */}
        <div>
          <SkeletonBase className="h-5 w-2/3 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <SkeletonBase className="h-4 w-4 rounded" />
                <SkeletonBase className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Photo Upload */}
        <div>
          <SkeletonBase className="h-5 w-40 mb-3" />
          <SkeletonBase className="h-32 w-full rounded-lg border-2 border-dashed border-gray-300" />
        </div>
        
        {/* Comments */}
        <div>
          <SkeletonBase className="h-5 w-24 mb-3" />
          <SkeletonBase className="h-24 w-full rounded-lg" />
        </div>
      </SkeletonCard>
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <SkeletonButton className="w-24" />
        <div className="space-x-3">
          <SkeletonButton className="w-20" />
          <SkeletonButton className="w-28" />
        </div>
      </div>
    </div>
  )
}

export function AuditDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <SkeletonCard className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <SkeletonBase className="h-8 w-2/3 mb-2" />
            <SkeletonBase className="h-4 w-1/2 mb-4" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i}>
                  <SkeletonBase className="h-3 w-16 mb-1" />
                  <SkeletonBase className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
          
          <SkeletonBase className="h-8 w-24 rounded-full" />
        </div>
      </SkeletonCard>
      
      {/* Questions */}
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} className="p-6">
            <div className="flex items-start space-x-4">
              <SkeletonCircle size="w-8 h-8" />
              <div className="flex-1">
                <SkeletonBase className="h-5 w-3/4 mb-3" />
                <SkeletonBase className="h-4 w-1/2 mb-4" />
                
                {/* Photo placeholder */}
                {i % 3 === 0 && (
                  <SkeletonImage className="w-32 h-24 mb-3" />
                )}
                
                <SkeletonText lines={2} className="w-full" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <SkeletonBase className="h-4 w-20 mb-2" />
                <SkeletonBase className="h-8 w-16" />
              </div>
              <SkeletonCircle size="w-12 h-12" className="bg-gray-100" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      
      {/* Chart */}
      <SkeletonCard className="p-6">
        <SkeletonBase className="h-6 w-48 mb-6" />
        <SkeletonBase className="h-64 w-full" />
      </SkeletonCard>
      
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="p-6">
          <SkeletonBase className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <SkeletonCircle size="w-8 h-8" />
                <div className="flex-1">
                  <SkeletonBase className="h-4 w-3/4 mb-1" />
                  <SkeletonBase className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
        
        <SkeletonCard className="p-6">
          <SkeletonBase className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SkeletonBase className="h-4 w-4 rounded" />
                  <SkeletonBase className="h-4 w-32" />
                </div>
                <SkeletonBase className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  )
}
