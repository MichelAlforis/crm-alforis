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
import { DEFAULT_TODAY_TASKS_COUNT } from '@/lib/dashboardMetrics'

interface NavbarProps {
  onMenuClick?: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { logout, user } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const dailyTasksCount = DEFAULT_TODAY_TASKS_COUNT

  return (
    <nav className="navbar">
      <div className="navbar-content max-w-none">
        {/* Left Section: Menu + Search */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="btn-ghost btn-md lg:hidden shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block w-full max-w-xl">
            <GlobalSearchInputAdvanced />
          </div>
        </div>

        {/* Right Section: Actions + User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Icon - Mobile */}
          <div className="md:hidden">
            <button className="btn-ghost btn-md" aria-label="Rechercher">
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Daily Tasks */}
          <Link
            href="/dashboard/tasks"
            className="btn-ghost btn-md relative"
            aria-label="Voir les tâches du jour"
          >
            <Bell className="w-5 h-5" />
            {dailyTasksCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse-soft">
                {dailyTasksCount}
              </span>
            )}
          </Link>

          {/* Brand Name - Hidden on small screens */}
          <div className="hidden sm:block px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <span className="text-sm font-semibold text-white tracking-wide">
              TPM Finance
            </span>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Menu utilisateur"
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">
                  {user?.email?.split('@')[0] || 'Utilisateur'}
                </span>
                <span className="text-xs text-gray-500">Administrateur</span>
              </div>
              <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase() || 'U'}
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
                <div className="dropdown right-0 mt-2 w-64 z-20 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.email || 'utilisateur@example.com'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Compte administrateur
                    </p>
                  </div>

                  <div className="py-1">
                    <button className="dropdown-item flex items-center gap-3">
                      <User className="w-4 h-4" />
                      <span>Mon profil</span>
                    </button>
                    <Link
                      href="/dashboard/tasks"
                      className="dropdown-item flex items-center gap-3"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Bell className="w-4 h-4" />
                      <span>Tâches du jour</span>
                      {dailyTasksCount > 0 && (
                        <span className="ml-auto badge-danger">
                          {dailyTasksCount}
                        </span>
                      )}
                    </Link>
                  </div>

                  <div className="dropdown-divider" />

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        logout()
                      }}
                      className="dropdown-item text-red-600 hover:bg-red-50 w-full"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
