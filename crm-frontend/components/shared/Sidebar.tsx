// components/shared/Sidebar.tsx
// ============= ULTRA MODERN SIDEBAR =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard,
  Users,
  UserCircle2,
  Building2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  LogOut,
  HelpCircle,
  FileUp,
  Bell,
  BarChart3,
  Briefcase,
  Package,
} from 'lucide-react'
import { DEFAULT_TODAY_TASKS_COUNT } from '@/lib/dashboardMetrics'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

// Menu items configuration
const MENU_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Vue d\'ensemble',
    badge: null,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    label: 'Investisseurs',
    href: '/dashboard/investors',
    icon: Users,
    description: 'Gestion des clients',
    badge: '24',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    label: 'Personnes',
    href: '/dashboard/people',
    icon: UserCircle2,
    description: 'Annuaire des contacts',
    badge: null,
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    label: 'Organisations',
    href: '/dashboard/organisations',
    icon: Building2,
    description: 'Distributeurs, émetteurs...',
    badge: null,
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    label: 'Mandats',
    href: '/dashboard/mandats',
    icon: Briefcase,
    description: 'Mandats de distribution',
    badge: null,
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    label: 'Produits',
    href: '/dashboard/produits',
    icon: Package,
    description: 'OPCVM, ETF, SCPI...',
    badge: null,
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    label: 'Fournisseurs',
    href: '/dashboard/fournisseurs',
    icon: Building2,
    description: 'Partenaires FSS (legacy)',
    badge: '12',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    label: 'Interactions',
    href: '/dashboard/interactions',
    icon: MessageSquare,
    description: 'Historique',
    badge: '8',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    label: 'KPIs',
    href: '/dashboard/kpis',
    icon: BarChart3,
    description: 'Analytics',
    badge: null,
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    label: 'Import',
    href: '/dashboard/imports',
    icon: FileUp,
    description: 'Importer données',
    badge: null,
    gradient: 'from-yellow-500 to-orange-500',
  },
]

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const tasksDueToday = DEFAULT_TODAY_TASKS_COUNT

  const isActive = (href: string): boolean => {
    if (!pathname) return false
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden z-30 animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed md:sticky top-0 z-40 h-screen',
          'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
          'border-r border-white/10',
          'transition-all duration-300 ease-in-out',
          'flex flex-col',
          'shadow-2xl',
          collapsed ? 'w-20' : 'w-72',
          !isOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="h-20 px-4 flex items-center justify-between">
            {!collapsed ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                    <span className="text-white font-bold text-lg">T</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 blur transition-opacity" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-white">
                      TPM Finance
                    </h1>
                    <p className="text-xs text-slate-400">CRM Portal</p>
                  </div>
                </div>

                {/* Collapse button */}
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="hidden md:flex p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>

                {/* Close button (mobile) */}
                <button
                  onClick={onClose}
                  className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setCollapsed(false)}
                className="mx-auto p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Daily Tasks Indicator */}
          <div className="px-3 pb-4">
            {collapsed ? (
              <Link
                href="/dashboard/tasks"
                className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
              >
                <Bell className="h-5 w-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-slate-900 bg-red-500 px-1 text-[10px] font-semibold text-white shadow-lg">
                  {tasksDueToday}
                </span>
              </Link>
            ) : (
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/20"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-amber-500/40">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-slate-900 bg-red-500 px-1 text-[10px] font-semibold text-white shadow-lg">
                    {tasksDueToday}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Tâches du jour
                  </p>
                  <p className="text-sm font-semibold text-white">
                    Consultez votre planning
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const isHovered = hoveredItem === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={clsx(
                    'group relative flex items-center gap-3',
                    'px-3 py-3 rounded-xl',
                    'transition-all duration-200',
                    'overflow-hidden',
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Hover Effect Background */}
                  {!active && isHovered && !collapsed && (
                    <div className={clsx(
                      'absolute inset-0 bg-gradient-to-r opacity-10',
                      item.gradient
                    )} />
                  )}

                  {/* Icon Container */}
                  <div className={clsx(
                    'relative flex items-center justify-center',
                    'w-9 h-9 rounded-lg flex-shrink-0',
                    'transition-all duration-200',
                    active
                      ? 'bg-white/20'
                      : 'bg-white/5 group-hover:bg-white/10'
                  )}>
                    <Icon
                      className={clsx(
                        'w-5 h-5 transition-all duration-200',
                        active && 'scale-110'
                      )}
                    />
                  </div>

                  {!collapsed && (
                    <>
                      <div className="flex-1 relative z-10">
                        <p className="text-sm font-semibold">
                          {item.label}
                        </p>
                        <p className={clsx(
                          'text-xs transition-colors',
                          active ? 'text-white/70' : 'text-slate-400'
                        )}>
                          {item.description}
                        </p>
                      </div>

                      {/* Badge */}
                      {item.badge && (
                        <div className={clsx(
                          'px-2 py-0.5 rounded-md text-xs font-bold',
                          'transition-all duration-200',
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-slate-300 group-hover:bg-white/20'
                        )}>
                          {item.badge}
                        </div>
                      )}

                      {/* Active Indicator */}
                      {active && (
                        <div className="w-1 h-8 bg-white rounded-full opacity-100" />
                      )}
                    </>
                  )}

                  {/* Collapsed Badge */}
                  {collapsed && item.badge && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {item.badge === 'NEW' ? '!' : item.badge}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="px-3">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Secondary Navigation */}
          <div className="px-3 py-3 space-y-1">
            <Link
              href="/dashboard/settings"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'text-slate-300 hover:text-white hover:bg-white/10',
                'transition-all duration-200',
                collapsed && 'justify-center'
              )}
            >
              <Settings className="w-4 h-4" />
              {!collapsed && <span className="text-sm">Paramètres</span>}
            </Link>

            <Link
              href="/dashboard/help"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'text-slate-300 hover:text-white hover:bg-white/10',
                'transition-all duration-200',
                collapsed && 'justify-center'
              )}
            >
              <HelpCircle className="w-4 h-4" />
              {!collapsed && <span className="text-sm">Aide</span>}
            </Link>
          </div>

          {/* Footer - User Profile */}
          <div className="px-3 py-4 border-t border-white/10">
            {!collapsed ? (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    Admin User
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    admin@tpm.finance
                  </p>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ) : (
              <button className="mx-auto w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center relative group">
                <span className="text-white font-bold text-sm">A</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
