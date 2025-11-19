import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
//

import { useAuthStore } from '../stores/auth'
import { USER_ROLE_LABELS, UserRole } from '@trakr/shared'
import { MagnifyingGlassIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, ClockIcon, BuildingOffice2Icon, PencilSquareIcon, MapIcon, DocumentTextIcon, ChartBarIcon, Cog6ToothIcon, UsersIcon, PresentationChartLineIcon, BellIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useOrganization } from '../contexts/OrganizationContext'
//

import { Toaster } from 'react-hot-toast'
import NotificationDropdown from './NotificationDropdown'
import { APP_VERSION } from '@/utils/appInfo'

interface DashboardLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, subtitle, children }) => {
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [compact, setCompact] = useState<boolean>(false)
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

  // Load/save compact preference per user
  useEffect(() => {
    const id = useAuthStore.getState().user?.id || 'anon'
    try {
      const val = localStorage.getItem(`nav:compact:${id}`)
      if (val != null) setCompact(val === '1')
    } catch {}
  }, [])
  useEffect(() => {
    const id = useAuthStore.getState().user?.id || 'anon'
    try { localStorage.setItem(`nav:compact:${id}`, compact ? '1' : '0') } catch {}
  }, [compact])

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

  // Unassigned page removed; no badge or extra queries

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

  const headerRef = useRef<HTMLDivElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState<number>(56)

  useEffect(() => {
    const update = () => {
      const h = headerRef.current?.getBoundingClientRect().height || 56
      setHeaderHeight(Math.max(40, Math.round(h)))
    }
    update()

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update())
      if (headerRef.current) ro.observe(headerRef.current)
    }

    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      if (ro) ro.disconnect()
    }
  }, [])

  const currentYear = new Date().getFullYear()

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
        <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 text-gray-900 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col max-h-screen overflow-hidden`}>
          {/* Enhanced mobile header */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
              <span className="text-xl font-bold tracking-wide text-gray-900">Trakr</span>
            </div>
            <button className="touch-target p-2 hover:bg-gray-100 rounded-lg text-gray-700" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Mobile-optimized search */}
            <div className="px-6 py-4">
              <div className="rounded-md flex items-center px-3 py-2 border border-gray-200">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                <input 
                  placeholder="Search" 
                  className="ml-2 bg-transparent placeholder-gray-400 text-gray-700 text-base outline-none flex-1"
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
            <nav className="px-4 space-y-2 pb-4" aria-label="Primary">
              <div className="px-1 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Navigation</div>
              {nav.map(item => {
                const active = location.pathname.startsWith(item.to)
                return (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    onClick={() => setMobileOpen(false)} 
                    title={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {/* Left border indicator */}
                    <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full transition-all duration-200 ${active ? 'bg-primary-600' : 'bg-transparent group-hover:bg-gray-300'}`} />
                    
                    <span className={`shrink-0 transition-colors duration-200 ${active ? 'text-primary-700' : 'text-gray-500 group-hover:text-gray-700'}`}>{item.icon}</span>
                    <span className={`text-sm transition-colors duration-200 ${active ? 'text-primary-800 font-semibold' : 'text-gray-800 group-hover:text-gray-900'}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
          
          {/* Enhanced user section - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 pb-8 border-t border-gray-200 space-y-4">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-lg font-medium border-2 border-gray-200">
                  {user?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-semibold text-base truncate">{user?.name}</div>
                <div className="text-gray-500 text-sm">{user?.role && USER_ROLE_LABELS[user.role]}</div>
              </div>
            </div>
            
            {/* Mobile-optimized action buttons - Compact layout */}
            <div className="space-y-1">
              <Link 
                to="/profile" 
                onClick={() => setMobileOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 touch-target w-full text-sm text-gray-700"
              >
                <span>Profile</span>
              </Link>
              <Link 
                to="/profile/signature" 
                onClick={() => setMobileOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 touch-target w-full text-sm text-gray-700"
              >
                <PencilSquareIcon className="w-4 h-4" />
                <span>Signature</span>
              </Link>
              <Link 
                to="/settings" 
                onClick={() => setMobileOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 touch-target w-full text-sm text-gray-700"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              <button 
                onClick={signOut} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 touch-target w-full text-sm text-gray-700"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
            <div className="pt-3">
              <div className="rounded-xl border border-primary-200/70 bg-gradient-to-br from-primary-50 to-white px-4 py-2 text-center shadow-sm">
                <p className="text-xs font-semibold text-primary-700 tracking-wide">Trakr</p>
                <p className="text-[11px] text-primary-600/80">© {currentYear} · v{APP_VERSION}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {/* Sidebar */}
      <aside className={`hidden md:flex ${compact ? 'md:w-16' : 'md:w-64 lg:w-72'} flex-col bg-white border-r border-gray-200 text-gray-900 pb-9 overflow-y-auto transition-all duration-200 md:relative md:z-20 md:shadow-lg`}>
        <div className="h-18 px-5 flex items-center justify-between">
          <Link to={isAdmin ? '/dashboard/admin' : '/'} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
            {!compact && <span className="text-xl font-bold tracking-wide">Trakr</span>}
          </Link>
        </div>
        <div className="px-3">
          {!compact && (
            <div className="rounded-md flex items-center px-3 py-2 border border-gray-200">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <input 
                placeholder="Search" 
                className="ml-2 bg-transparent placeholder-gray-400 text-gray-700 text-sm outline-none flex-1"
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
          )}
        </div>
        <nav className="mt-3 px-2 space-y-1" aria-label="Primary">
          {!compact && (
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Navigation</div>
          )}
          {nav.map(item => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 ${compact ? 'justify-center' : ''} px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {/* Left border indicator */}
                {!compact && (
                  <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full transition-all duration-200 ${active ? 'bg-primary-600' : 'bg-transparent group-hover:bg-gray-300'}`} />
                )}
                
                <span className={`shrink-0 transition-colors duration-200 ${active ? 'text-primary-700' : 'text-gray-500 group-hover:text-gray-700'}`}>{item.icon}</span>
                {!compact && (
                  <span className={`text-sm transition-colors duration-200 ${active ? 'text-primary-800 font-semibold' : 'text-gray-800 group-hover:text-gray-900'}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-3 pt-3 border-t border-gray-200 space-y-2">
          <button
            className="w-full inline-flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-2 hover:shadow-sm transition"
            onClick={() => setCompact(v => !v)}
            aria-label="Toggle compact sidebar"
            title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-sm">{compact ? '»' : '«'}</span>
            {!compact && <span>Compact mode</span>}
          </button>
          {!compact ? (
            <div className="rounded-xl border border-primary-200/70 bg-gradient-to-br from-primary-50 to-white px-3 py-2 text-[11px] text-primary-600/80 shadow-sm">
              <p className="font-semibold text-primary-700">Trakr</p>
              <p className="mt-0.5">© {currentYear} · v{APP_VERSION}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-[9px] uppercase tracking-wide text-gray-400">
              <div className="flex items-center justify-center w-9 h-9 rounded-full border border-primary-200 bg-primary-50 text-primary-600" title={`Trakr © ${currentYear} · v${APP_VERSION}`}>
                <InformationCircleIcon className="w-4 h-4" />
              </div>
              <span className="text-primary-600">© {String(currentYear).slice(-2)}</span>
              <span className="text-primary-600">v{APP_VERSION}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ ['--app-header-height' as any]: `${headerHeight}px` }}>
        {/* Modern Enhanced Header */}
        <header ref={headerRef} className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] pt-[env(safe-area-inset-top)]">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight truncate">{title}</h1>
                <p className="hidden sm:block text-sm text-gray-500 font-medium mt-0.5">{subtitle ?? `Welcome back, ${user?.name?.split(' ')[0] || 'Admin'}`}</p>
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
