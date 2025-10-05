import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { USER_ROLE_LABELS, UserRole } from '@trakr/shared'
import { MagnifyingGlassIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, ClockIcon, BuildingOffice2Icon, PencilSquareIcon, MapIcon, DocumentTextIcon, ChartBarIcon, Cog6ToothIcon, UsersIcon, PresentationChartLineIcon, BellIcon } from '@heroicons/react/24/outline'
import { useOrganization } from '../contexts/OrganizationContext'
import { Toaster } from 'react-hot-toast'
import NotificationDropdown from './NotificationDropdown'

interface DashboardLayoutProps {
  title: string
  children: ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, children }) => {
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  // Close the overflow menu on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!moreOpen) return
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [moreOpen])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuOpen) return
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [userMenuOpen])

  const { isSuperAdmin } = useOrganization()
  const isAdmin = !!user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || isSuperAdmin)
  const isBranchManager = !!user && user.role === UserRole.BRANCH_MANAGER
  const isAuditor = !!user && user.role === UserRole.AUDITOR

  const nav = [
    // Dashboard links - role specific
    { to: '/dashboard/admin', label: 'My Dashboard', icon: <ChartBarIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/dashboard/branch-manager', label: 'My Dashboard', icon: <ChartBarIcon className="w-5 h-5" />, show: isBranchManager },
    { to: '/dashboard/auditor', label: 'My Dashboard', icon: <ChartBarIcon className="w-5 h-5" />, show: isAuditor },
    
    // Notifications - everyone can see
    { to: '/notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" />, show: true },
    
    // Analytics - everyone can see
    { to: '/analytics', label: 'Analytics', icon: <PresentationChartLineIcon className="w-5 h-5" />, show: true },
    
    // Admin-only management sections
    { to: '/manage/surveys', label: 'Survey Templates', icon: <DocumentTextIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/branches', label: 'Manage Branches', icon: <BuildingOffice2Icon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/zones', label: 'Manage Zones', icon: <MapIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/users', label: 'Manage Users', icon: <UsersIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/activity/logs', label: 'Activity Logs', icon: <ClockIcon className="w-5 h-5" />, show: isAdmin },
  ].filter(i => i.show)

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <Toaster position="bottom-center" toastOptions={{ className: 'text-sm rounded-full px-4 py-2' }} />
      <div className="flex flex-1 overflow-hidden">
      {/* Mobile Drawer */}
      <div className={`${mobileOpen ? '' : 'pointer-events-none'} md:hidden`}>
        <div
          className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`fixed inset-y-0 left-0 z-50 w-80 text-white bg-gradient-to-b from-primary-700 to-primary-600 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col max-h-screen overflow-hidden`}>
          {/* Enhanced mobile header */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-primary-600">T</span>
              </div>
              <span className="text-xl font-bold tracking-wide">Trakr</span>
            </div>
            <button className="touch-target p-2 hover:bg-white/10 rounded-xl text-white" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Mobile-optimized search */}
            <div className="px-6 py-4">
              <div className="bg-white/10 rounded-xl flex items-center px-4 py-3">
                <MagnifyingGlassIcon className="w-5 h-5 text-white/80" />
                <input 
                  placeholder="Search" 
                  className="ml-3 bg-transparent placeholder-white/70 text-white text-base outline-none flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const query = e.currentTarget.value.trim()
                      if (query) {
                        navigate(`/search?q=${encodeURIComponent(query)}`)
                        setMobileOpen(false)
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Enhanced navigation with better touch targets */}
            <nav className="px-4 space-y-2 pb-4">
              {nav.map(item => {
                const active = location.pathname.startsWith(item.to)
                return (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    onClick={() => setMobileOpen(false)} 
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition touch-target ${active ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-base font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          
          {/* Enhanced user section - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 pb-8 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 text-white/90 flex items-center justify-center text-lg font-medium border-2 border-white/20">
                  {user?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white/90 font-semibold text-base truncate">{user?.name}</div>
                <div className="text-white/70 text-sm">{user?.role && USER_ROLE_LABELS[user.role]}</div>
              </div>
            </div>
            
            {/* Mobile-optimized action buttons - Compact layout */}
            <div className="space-y-1">
              <Link 
                to="/profile" 
                onClick={() => setMobileOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 touch-target w-full text-sm"
              >
                <span>Profile</span>
              </Link>
              <Link 
                to="/profile/signature" 
                onClick={() => setMobileOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 touch-target w-full text-sm"
              >
                <PencilSquareIcon className="w-4 h-4" />
                <span>Signature</span>
              </Link>
              <Link 
                to="/settings" 
                onClick={() => setMobileOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 touch-target w-full text-sm"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              <button 
                onClick={signOut} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 touch-target w-full text-sm"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col text-white bg-gradient-to-b from-primary-700 to-primary-600 pb-9 overflow-y-auto">
        <div className="h-18 px-5 flex items-center justify-between">
          <Link to={isAdmin ? '/dashboard/admin' : '/'} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-600">T</span>
            </div>
            <span className="text-xl font-bold tracking-wide">Trakr</span>
          </Link>
        </div>
        <div className="px-4">
          <div className="bg-white/10 rounded-md flex items-center px-3 py-2">
            <MagnifyingGlassIcon className="w-5 h-5 text-white/80" />
            <input 
              placeholder="Search" 
              className="ml-2 bg-transparent placeholder-white/70 text-white text-sm outline-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = e.currentTarget.value.trim()
                  if (query) {
                    navigate(`/search?q=${encodeURIComponent(query)}`)
                  }
                }
              }}
            />
          </div>
        </div>
        <nav className="mt-4 px-2 space-y-1">
          {nav.map(item => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${active ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10 text-sm space-y-3">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 text-white/90 flex items-center justify-center text-sm font-medium border border-white/20">
                {user?.name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <div className="text-white/90 font-medium truncate max-w-[12rem]">{user?.name}</div>
              <div className="text-white/70">{user?.role && USER_ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/profile" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">Profile</Link>
            <Link to="/profile/signature" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">Signature</Link>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">
            <ArrowRightOnRectangleIcon className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Modern Enhanced Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 pt-[env(safe-area-inset-top)]">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
            {/* Left: Menu Button (Mobile) + Title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <button 
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors" 
                onClick={() => setMobileOpen(true)} 
                aria-label="Open navigation"
              >
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
                <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
              </div>
            </div>

            {/* Center: Search (Desktop) */}
            <div className="hidden lg:flex items-center flex-1 max-w-md">
              <div className="relative w-full">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  placeholder="Search..." 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const query = e.currentTarget.value.trim()
                      if (query) {
                        navigate(`/search?q=${encodeURIComponent(query)}`)
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search (Mobile) */}
              <button 
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                aria-label="Search" 
                onClick={() => setMobileSearchOpen(true)}
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
              </button>

              {/* Notifications */}
              <NotificationDropdown />

              {/* Help (Desktop) */}
              <Link 
                to="/help" 
                className="hidden lg:inline-flex p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                aria-label="Help"
              >
                <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600" />
              </Link>

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-gray-200"></div>

              {/* User Menu */}
              <div ref={userMenuRef} className="relative">
                <button 
                  className="flex items-center gap-2 sm:gap-3 p-1 sm:px-3 sm:py-2 hover:bg-gray-100 rounded-lg transition-colors" 
                  onClick={() => setUserMenuOpen(v => !v)} 
                  aria-haspopup="menu" 
                  aria-expanded={userMenuOpen} 
                  aria-label="User menu"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-sm font-semibold ring-2 ring-gray-200">
                      {user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</div>
                    <div className="text-xs text-gray-500">{user?.role && USER_ROLE_LABELS[user.role]}</div>
                  </div>
                  <svg className="hidden sm:block w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200" role="menu">
                    {/* User Info */}
                    <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-base font-semibold ring-2 ring-white">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{user?.name}</div>
                          <div className="text-xs text-gray-600 truncate">{user?.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link 
                        to="/profile" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" 
                        role="menuitem" 
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </Link>
                      <Link 
                        to="/profile/signature" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" 
                        role="menuitem" 
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <PencilSquareIcon className="w-4 h-4 text-gray-500" />
                        <span>Signature</span>
                      </Link>
                      <Link 
                        to="/settings" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" 
                        role="menuitem" 
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Cog6ToothIcon className="w-4 h-4 text-gray-500" />
                        <span>Settings</span>
                      </Link>
                      <Link 
                        to="/help" 
                        className="lg:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" 
                        role="menuitem" 
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500" />
                        <span>Help & Support</span>
                      </Link>
                    </div>
                    
                    {/* Sign Out */}
                    <div className="border-t border-gray-200 py-1">
                      <button 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors" 
                        role="menuitem" 
                        onClick={() => { setUserMenuOpen(false); signOut() }}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-4">
          {children}
        </main>

        {/* Mobile search sheet */}
        {mobileSearchOpen && (
          <div className="fixed inset-0 z-50 bg-white">
            <div className="pt-[env(safe-area-inset-top)] px-4 py-3 flex items-center justify-between border-b">
              <h2 className="text-base font-semibold text-gray-900">Search</h2>
              <button className="btn-ghost p-2 h-10 w-10" aria-label="Close search" onClick={() => setMobileSearchOpen(false)}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  className="input pl-10" 
                  placeholder="Search across audits, users, templates…" 
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const query = e.currentTarget.value.trim()
                      if (query) {
                        navigate(`/search?q=${encodeURIComponent(query)}`)
                        setMobileSearchOpen(false)
                      }
                    }
                  }}
                />
              </div>
              <div className="mt-4 text-xs text-gray-500">
                <p>Tip: Press Enter to search or use filters in results page</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default DashboardLayout
