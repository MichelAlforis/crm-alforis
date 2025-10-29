/**
 * Navbar Component
 *
 * Main navigation bar with search functionality and user actions.
 * Uses centralized design system from styles/
 */
'use client'

import React from 'react'
import { ClipboardList, Menu, Search, User } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarContext } from '@/contexts/SidebarContext'
import GlobalSearchInputAdvanced from '@/components/shared/GlobalSearchInputAdvanced'
import { useTaskViews } from '@/hooks/useTasks'
import NotificationBell from '@/components/shared/NotificationBell'
import ThemeToggle from '@/components/shared/ThemeToggle'

export default function Navbar() {
  const sidebar = useSidebarContext()
  const { logout, user } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showTasksTooltip, setShowTasksTooltip] = React.useState(false)
  const [showSearchTooltip, setShowSearchTooltip] = React.useState(false)
  const { todayCount } = useTaskViews()
  const dailyTasksCount = todayCount

  return (
    <nav className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">
      {/* Animated gradient border on top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="max-w-none px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Menu + Search */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={sidebar.toggleMobile}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>

            {/* Search Bar - Desktop */}
            <div className="hidden md:block w-full max-w-3xl">
              <GlobalSearchInputAdvanced />
            </div>
          </div>

          {/* Right Section: Actions + User */}
          <div className="flex items-center gap-2">
            {/* Search Icon - Mobile */}
            <div className="md:hidden relative group">
              <Link
                href="/dashboard/search"
                onMouseEnter={() => setShowSearchTooltip(true)}
                onMouseLeave={() => setShowSearchTooltip(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
                aria-label="Rechercher"
              >
                <Search className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </Link>

              {showSearchTooltip && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap border border-slate-700/50">
                    Rechercher
                    <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700/50 rotate-45" />
                  </div>
                </div>
              )}
            </div>

            {/* Actions Group - with glassmorphism card */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-slate-800/50 dark:to-slate-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
              {/* Daily Tasks */}
              <div className="relative group">
                <Link
                  href="/dashboard/tasks"
                  onMouseEnter={() => setShowTasksTooltip(true)}
                  onMouseLeave={() => setShowTasksTooltip(false)}
                  className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/80 dark:hover:bg-slate-700/80 hover:scale-110 active:scale-95 transition-all duration-200"
                  aria-label="Voir les tâches du jour"
                >
                  <ClipboardList className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  {dailyTasksCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-br from-red-500 to-pink-600 rounded-full shadow-lg shadow-red-500/50 animate-pulse border-2 border-white dark:border-slate-800">
                      {dailyTasksCount}
                    </span>
                  )}
                </Link>

                {showTasksTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                    <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap border border-slate-700/50">
                      {dailyTasksCount > 0 ? `${dailyTasksCount} tâche${dailyTasksCount > 1 ? 's' : ''} aujourd'hui` : 'Tâches du jour'}
                      <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700/50 rotate-45" />
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* Theme Toggle */}
              <ThemeToggle size="sm" />
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-slate-600" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gradient-to-br hover:from-white/80 hover:to-gray-50/80 dark:hover:from-slate-800/50 dark:hover:to-slate-700/50 hover:shadow-sm transition-all duration-200 group border border-transparent hover:border-gray-200/50 dark:hover:border-slate-700/50"
                aria-label="Menu utilisateur"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {user?.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Admin</span>
                </div>
                <div className="relative group-hover:scale-105 transition-transform">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg shadow-blue-500/30 ring-2 ring-white dark:ring-slate-900 group-hover:shadow-xl group-hover:shadow-blue-500/50 transition-all">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse shadow-sm shadow-green-400/50"></div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 mt-3 w-72 bg-foreground rounded-2xl shadow-2xl border border-border z-20 animate-fadeIn overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-border dark:from-slate-800/80 dark:to-slate-800/60 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold shadow-lg">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate dark:text-slate-100">
                            {user?.email?.split('@')[0] || 'Utilisateur'}
                          </p>
                          <p className="text-xs text-text-muted dark:text-slate-400">
                            Administrateur
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-text-muted dark:text-slate-400 truncate">
                        {user?.email || 'utilisateur@example.com'}
                      </p>
                    </div>

                    <div className="py-2">
                      <Link
                        href="/dashboard/settings"
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted transition-colors group dark:hover:bg-slate-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-lg group-hover:bg-primary/10 transition-colors dark:bg-slate-700 dark:group-hover:bg-blue-500/20">
                          <User className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors dark:text-slate-300 dark:group-hover:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary dark:text-slate-300 dark:group-hover:text-slate-100">Mon profil</span>
                      </Link>
                      <Link
                        href="/dashboard/tasks"
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted transition-colors group dark:hover:bg-slate-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors relative dark:bg-orange-500/25 dark:group-hover:bg-orange-500/40">
                          <ClipboardList className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          {dailyTasksCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full shadow">
                              {dailyTasksCount}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary flex-1 dark:text-slate-300 dark:group-hover:text-slate-100">Tâches du jour</span>
                        {dailyTasksCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full dark:bg-red-500/20 dark:text-red-200">
                            {dailyTasksCount}
                          </span>
                        )}
                      </Link>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-1" />

                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors group dark:text-red-400 dark:hover:bg-red-500/15"
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors dark:bg-red-500/15 dark:group-hover:bg-red-500/25">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
