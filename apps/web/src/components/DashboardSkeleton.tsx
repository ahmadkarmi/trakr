import { SkeletonStats, SkeletonTable, SkeletonCard } from './Skeleton'

export function DashboardAdminSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-full w-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats skeleton */}
          <SkeletonStats />
          
          {/* Recent activity skeleton */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="animate-pulse h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="p-6">
              <SkeletonTable rows={4} />
            </div>
          </div>

          {/* Quick actions skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardAuditorSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-40 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-28"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-full w-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* My audits stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Assigned audits table */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="animate-pulse h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="p-6">
              <SkeletonTable rows={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardBranchManagerSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-52 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-full w-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Branch stats */}
          <SkeletonStats />
          
          {/* Branch audits overview */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="animate-pulse h-6 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="p-6">
              <SkeletonTable rows={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
