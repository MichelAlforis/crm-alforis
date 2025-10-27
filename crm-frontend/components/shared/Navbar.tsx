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
  const { todayCount } = useTaskViews()
  const dailyTasksCount = todayCount

  return (
    <nav className="sticky top-0 z-40 bg-foreground/80 backdrop-blur-md border-b border-border shadow-sm transition-colors duration-300 dark:bg-slate-900/95 dark:border-slate-700">
      <div className="max-w-none px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Left Section: Menu + Search */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={sidebar.toggleMobile}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0 dark:hover:bg-slate-700 dark:active:bg-slate-600"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-text-secondary dark:text-slate-300" />
            </button>

            {/* Search Bar - Desktop */}
            <div className="hidden md:block w-full max-w-2xl">
              <GlobalSearchInputAdvanced />
            </div>
          </div>

          {/* Right Section: Actions + User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon - Mobile - redirects to search page */}
            <div className="md:hidden">
              <Link href="/dashboard/search" className="p-2 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors dark:hover:bg-slate-700 dark:active:bg-slate-600" aria-label="Rechercher">
                <Search className="w-5 h-5 text-text-secondary dark:text-slate-300" />
              </Link>
            </div>

            <ThemeToggle size="sm" />

            {/* Notifications temps réel */}
            <NotificationBell />

            {/* Daily Tasks */}
            <Link
              href="/dashboard/tasks"
              className="relative p-2 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors group dark:hover:bg-slate-700 dark:active:bg-slate-600"
              aria-label="Voir les tâches du jour"
            >
              <ClipboardList className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors dark:text-slate-300 dark:group-hover:text-blue-400" />
              {dailyTasksCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-lg animate-pulse">
                  {dailyTasksCount}
                </span>
              )}
            </Link>

            {/* Brand Name - Hidden on small screens */}
            <div className="hidden sm:block px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-md">
              <span className="text-sm font-bold text-white tracking-wide">
                TPM Finance
              </span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted active:bg-muted/80 transition-all duration-200 group dark:hover:bg-slate-700 dark:active:bg-slate-600"
                aria-label="Menu utilisateur"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors dark:text-slate-100 dark:group-hover:text-blue-400">
                    {user?.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-text-muted dark:text-slate-400">Administrateur</span>
                </div>
                <div className="relative">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg ring-2 ring-white group-hover:ring-blue-200 transition-all dark:ring-slate-700 dark:group-hover:ring-blue-500">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 dark:bg-green-500"></div>
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
