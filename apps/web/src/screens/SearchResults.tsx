import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery } from '@tanstack/react-query'
import { Audit, Branch, User, AuditStatus, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import StatusBadge from '@/components/StatusBadge'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/auth'

interface SearchResult {
  type: 'audit' | 'branch' | 'user'
  id: string
  title: string
  subtitle: string
  metadata?: string
  status?: AuditStatus
  data: any
}

const SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const query = searchParams.get('q') || ''
  const [sortBy, setSortBy] = React.useState<'recent' | 'relevance' | 'alphabetical'>('relevance')

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN

  // Fetch all data
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: QK.AUDITS('search'),
    queryFn: () => api.getAudits(),
    enabled: !!query,
  })

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(),
    queryFn: () => api.getBranches(),
    enabled: !!query && isAdmin,
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: QK.USERS,
    queryFn: () => api.getUsers(),
    enabled: !!query && isAdmin,
  })

  // Search logic
  const searchResults = React.useMemo(() => {
    if (!query) return []

    const results: SearchResult[] = []
    const searchLower = query.toLowerCase()

    // Search audits (always enabled)
    audits.forEach(audit => {
      const branch = branches.find(b => b.id === audit.branchId)
      const branchName = branch?.name || ''
      
      if (
        audit.id.toLowerCase().includes(searchLower) ||
        branchName.toLowerCase().includes(searchLower) ||
        audit.status.toLowerCase().includes(searchLower)
      ) {
        results.push({
          type: 'audit',
          id: audit.id,
          title: branchName,
          subtitle: `Audit ID: ${audit.id.slice(0, 8)}`,
          metadata: audit.dueAt ? new Date(audit.dueAt).toLocaleDateString() : undefined,
          status: audit.status,
          data: audit,
        })
      }
    })

    // Search branches (admin only)
    if (isAdmin) {
      branches.forEach(branch => {
        if (
          branch.name.toLowerCase().includes(searchLower) ||
          branch.address?.toLowerCase().includes(searchLower)
        ) {
          const branchAudits = audits.filter(a => a.branchId === branch.id)
          results.push({
            type: 'branch',
            id: branch.id,
            title: branch.name,
            subtitle: branch.address || 'No address',
            metadata: `${branchAudits.length} audits`,
            data: branch,
          })
        }
      })

      // Search users (admin only)
      users.forEach(user => {
        if (
          user.name?.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower)
        ) {
          results.push({
            type: 'user',
            id: user.id,
            title: user.name || user.email,
            subtitle: user.email,
            metadata: user.role,
            data: user,
          })
        }
      })
    }

    return results
  }, [query, audits, branches, users, isAdmin])

  // Sort results
  const sortedResults = React.useMemo(() => {
    const sorted = [...searchResults]
    
    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'recent') {
      sorted.sort((a, b) => {
        if (a.type === 'audit' && b.type === 'audit') {
          return new Date(b.data.updatedAt).getTime() - new Date(a.data.updatedAt).getTime()
        }
        return 0
      })
    }
    
    return sorted
  }, [searchResults, sortBy])

  const handleClear = () => {
    setSearchParams({})
    // Navigate to appropriate dashboard based on role
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) {
      navigate('/dashboard/admin')
    } else if (user?.role === UserRole.BRANCH_MANAGER) {
      navigate('/dashboard/branch-manager')
    } else {
      navigate('/dashboard/auditor')
    }
  }

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'audit':
        navigate(`/audits/${result.id}/summary`)
        break
      case 'branch':
        navigate('/manage/branches')
        break
      case 'user':
        navigate('/manage/users')
        break
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-yellow-200 font-medium">{part}</mark>
            : part
        )}
      </>
    )
  }

  // Group results by type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      audits: [],
      branches: [],
      surveys: [],
      users: [],
    }
    
    sortedResults.forEach(result => {
      groups[`${result.type}s`]?.push(result)
    })
    
    return groups
  }, [sortedResults])

  return (
    <DashboardLayout title="Search Results">
      <div className="mobile-container breathing-room">
        {/* Search Header */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400"
              placeholder={isAdmin ? "Search audits, branches, users..." : "Search audits..."}
              value={query}
              onChange={(e) => setSearchParams({ q: e.target.value })}
              autoFocus
            />
            {query && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-600 font-medium"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {query && (
          <>
            {/* Results Meta & Sort */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">
                  Found <span className="font-bold text-gray-900">{sortedResults.length}</span> {sortedResults.length === 1 ? 'result' : 'results'}
                </p>
                {sortedResults.length > 0 && (
                  <span className="text-xs text-gray-400">•</span>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="recent">Sort: Recent</option>
                <option value="alphabetical">Sort: A-Z</option>
              </select>
            </div>

            {/* Results */}
            {sortedResults.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No results found for "<span className="text-primary-600">{query}</span>"
                </h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Try different keywords, check spelling, or adjust your filters
                </p>
                <button 
                  onClick={handleClear} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Audits */}
                {groupedResults.audits.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      <span>Audits</span>
                      <span className="text-sm font-normal text-gray-500">({groupedResults.audits.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {groupedResults.audits.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all text-left group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 flex-1 pr-2">
                              {highlightText(result.title, query)}
                            </h3>
                            {result.status && <StatusBadge status={result.status} />}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {highlightText(result.subtitle, query)}
                          </p>
                          {result.metadata && (
                            <p className="text-xs text-gray-500">Due: {result.metadata}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Branches */}
                {isAdmin && groupedResults.branches.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <span className="text-2xl">🏢</span>
                      <span>Branches</span>
                      <span className="text-sm font-normal text-gray-500">({groupedResults.branches.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {groupedResults.branches.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all text-left group"
                        >
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {highlightText(result.title, query)}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {highlightText(result.subtitle, query)}
                          </p>
                          <p className="text-xs text-gray-500">{result.metadata}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {isAdmin && groupedResults.users.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <span className="text-2xl">👤</span>
                      <span>Users</span>
                      <span className="text-sm font-normal text-gray-500">({groupedResults.users.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {groupedResults.users.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all text-left group"
                        >
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {highlightText(result.title, query)}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {highlightText(result.subtitle, query)}
                          </p>
                          <p className="text-xs text-gray-500">{result.metadata}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!query && (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Start searching
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              {isAdmin 
                ? "Search across audits, branches, and users to find exactly what you need"
                : "Search across all your audits to find what you need"
              }
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-gray-400">Try searching for:</span>
              <button 
                onClick={() => setSearchParams({ q: 'safety' })} 
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 font-medium transition-colors"
              >
                safety
              </button>
              <button 
                onClick={() => setSearchParams({ q: 'in_progress' })} 
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 font-medium transition-colors"
              >
                in_progress
              </button>
              <button 
                onClick={() => setSearchParams({ q: 'downtown' })} 
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 font-medium transition-colors"
              >
                downtown
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default SearchResults
