import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { USER_ROLE_LABELS, UserRole } from '@trakr/shared'
import { MagnifyingGlassIcon, BellIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, ClockIcon, BuildingOffice2Icon, ClipboardDocumentCheckIcon, PencilSquareIcon, EllipsisVerticalIcon, MapIcon, DocumentTextIcon, ChartBarIcon, Cog6ToothIcon, UsersIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  title: string
  children: ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, children }) => {
  const { user, signOut } = useAuthStore()
  const location = useLocation()
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

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN

  const nav = [
    { to: '/dashboard/admin', label: 'My Dashboard', icon: <ChartBarIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/surveys', label: 'Survey Templates', icon: <DocumentTextIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/branches', label: 'Manage Branches', icon: <BuildingOffice2Icon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/zones', label: 'Manage Zones', icon: <MapIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/manage/users', label: 'Manage Users', icon: <UsersIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/activity/logs', label: 'Activity Logs', icon: <ClockIcon className="w-5 h-5" />, show: isAdmin },
    { to: '/dashboard/branch-manager', label: 'Branch Manager', icon: <BuildingStorefrontIcon className="w-5 h-5" />, show: true },
    { to: '/dashboard/auditor', label: 'Audit Manager', icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />, show: true },
  ].filter(i => i.show)

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
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
                <input placeholder="Search" className="ml-3 bg-transparent placeholder-white/70 text-white text-base outline-none flex-1" />
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
            <input placeholder="Search" className="ml-2 bg-transparent placeholder-white/70 text-white text-sm outline-none flex-1" />
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
        {/* Enhanced mobile-first topbar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 pt-[env(safe-area-inset-top)]">
          <div className="mobile-container py-2 sm:py-3 flex items-center justify-between gap-3">
            {/* Left: menu + title (shrinkable) */}
            <div className="flex items-center gap-3 min-w-0">
              <button className="md:hidden touch-target p-2 hover:bg-gray-100 rounded-xl" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                <Bars3Icon className="w-6 h-6" />
              </button>
              <h1 className="heading-mobile-lg truncate xl:whitespace-normal xl:break-words xl:leading-snug xl:line-clamp-2" title={title}>{title}</h1>
            </div>

            {/* Middle: inline search (only on large screens) */}
            <div className="hidden lg:flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <input className="input pl-10" placeholder="Search across audits, users, templates…" />
              </div>
            </div>

            {/* Right: mobile-optimized actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button className="lg:hidden touch-target p-2 hover:bg-gray-100 rounded-xl" aria-label="Search" onClick={() => setMobileSearchOpen(true)}>
                <MagnifyingGlassIcon className="w-6 h-6" />
              </button>
              <button className="touch-target p-2 hover:bg-gray-100 rounded-xl" aria-label="Notifications">
                <BellIcon className="w-6 h-6" />
              </button>
              <Link to="/help" className="hidden lg:inline-flex touch-target p-2 hover:bg-gray-100 rounded-xl" aria-label="Help">
                <QuestionMarkCircleIcon className="w-6 h-6" />
              </Link>
              
              {/* Mobile overflow menu */}
              <div ref={moreRef} className="relative lg:hidden">
                <button className="touch-target p-2 hover:bg-gray-100 rounded-xl" aria-haspopup="menu" aria-expanded={moreOpen} aria-label="More actions" onClick={() => setMoreOpen(v => !v)}>
                  <EllipsisVerticalIcon className="w-6 h-6" />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-2 z-50" role="menu">
                    <Link to="/help" className="w-full text-left flex items-center gap-3 px-4 py-3 text-base hover:bg-gray-50 touch-target" role="menuitem" onClick={() => setMoreOpen(false)}>
                      <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600" /> 
                      <span>Help</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* User avatar menu */}
              <div ref={userMenuRef} className="relative">
                <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50" onClick={() => setUserMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={userMenuOpen} aria-label="User menu">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium border">
                      {user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm text-gray-900 max-w-[10rem] truncate">{user?.name}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg py-1 z-50" role="menu">
                    <div className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                    </div>
                    <div className="my-1 border-t" />
                    <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-gray-50" role="menuitem" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                    <Link to="/profile/signature" className="block px-3 py-2 text-sm hover:bg-gray-50" role="menuitem" onClick={() => setUserMenuOpen(false)}>Signature</Link>
                    <Link to="/settings" className="block px-3 py-2 text-sm hover:bg-gray-50" role="menuitem" onClick={() => setUserMenuOpen(false)}>Settings</Link>
                    <div className="my-1 border-t" />
                    <button className="block w-full text-left px-3 py-2 text-sm text-danger-700 hover:bg-danger-50" role="menuitem" onClick={() => { setUserMenuOpen(false); signOut() }}>
                      Sign Out
                    </button>
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
                <input className="input pl-10" placeholder="Search across audits, users, templates…" autoFocus />
              </div>
              <div className="mt-4 text-xs text-gray-500">
                <p>Tip: Try filters like <span className="font-mono">status:in_progress</span>, <span className="font-mono">user:alex</span>, or <span className="font-mono">survey:"Safety Check"</span>.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardLayout
