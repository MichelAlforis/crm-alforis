/**
 * Navbar Component
 *
 * Main navigation bar with search functionality and user actions.
 * Uses centralized design system from styles/
 */
'use client'

import React from 'react'
import { Bell, Menu, Search, User } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import GlobalSearchInputAdvanced from '@/components/shared/GlobalSearchInputAdvanced'
import { useTaskViews } from '@/hooks/useTasks'

interface NavbarProps {
  onMenuClick?: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { logout, user } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const { todayCount } = useTaskViews()
  const dailyTasksCount = todayCount

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-none px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Left Section: Menu + Search */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>

            {/* Search Bar - Desktop */}
            <div className="hidden md:block w-full max-w-2xl">
              <GlobalSearchInputAdvanced />
            </div>
          </div>

          {/* Right Section: Actions + User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon - Mobile */}
            <div className="md:hidden">
              <button className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors" aria-label="Rechercher">
                <Search className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Daily Tasks */}
            <Link
              href="/dashboard/tasks"
              className="relative p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors group"
              aria-label="Voir les tâches du jour"
            >
              <Bell className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
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
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 group"
                aria-label="Menu utilisateur"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {user?.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-gray-500">Administrateur</span>
                </div>
                <div className="relative">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg ring-2 ring-white group-hover:ring-blue-200 transition-all">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
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
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-20 animate-fadeIn overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold shadow-lg">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {user?.email?.split('@')[0] || 'Utilisateur'}
                          </p>
                          <p className="text-xs text-gray-600">
                            Administrateur
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email || 'utilisateur@example.com'}
                      </p>
                    </div>

                    <div className="py-2">
                      <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <User className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Mon profil</span>
                      </button>
                      <Link
                        href="/dashboard/tasks"
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors relative">
                          <Bell className="w-4 h-4 text-orange-600" />
                          {dailyTasksCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                              {dailyTasksCount}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">Tâches du jour</span>
                        {dailyTasksCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
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
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
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
