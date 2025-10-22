// components/shared/Sidebar.tsx
// ============= ULTRA MODERN SIDEBAR =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard,
  UserCircle2,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  Briefcase,
  Package,
  Workflow,
  Link as LinkIcon,
  Upload,
  Mail,
  Users,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import { useTaskViews } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { usePendingSuggestionsCount } from '@/hooks/useAI'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

// Menu items configuration
// ✅ ARCHITECTURE UNIFIÉE (2025-10-18)
// - Organisations (remplace Investisseurs + Fournisseurs)
// - People (contacts unifiés)
// - Workflows (automatisations)
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
    label: 'Organisations',
    href: '/dashboard/organisations',
    icon: Building2,
    description: 'Clients, fournisseurs, distributeurs...',
    badge: null,
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
    label: 'Workflows',
    href: '/dashboard/workflows',
    icon: Workflow,
    description: 'Automatisations',
    badge: null,
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    label: 'KPIs Fournisseurs',
    href: '/dashboard/kpis',
    icon: BarChart3,
    description: 'Indicateurs de performance',
    badge: null,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    label: 'Agent IA',
    href: '/dashboard/ai',
    icon: Sparkles,
    description: 'Suggestions intelligentes',
    badge: null, // Dynamic badge via pendingSuggestionsCount
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
  },
  {
    label: 'Campagnes Email',
    href: '/dashboard/campaigns',
    icon: Mail,
    description: 'Marketing automation',
    badge: null,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    label: 'Import Unifié',
    href: '/dashboard/imports/unified',
    icon: Upload,
    description: 'Organisations + Personnes',
    badge: 'NEW',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    label: 'Utilisateurs',
    href: '/dashboard/users',
    icon: Users,
    description: 'Gestion des comptes',
    badge: null,
    gradient: 'from-gray-500 to-slate-600',
  },
  // ❌ LEGACY ITEMS REMOVED (2025-10-18):
  // - Investisseurs → Organisations (type=client)
  // - Fournisseurs → Organisations (type=fournisseur)
  // - Interactions → Organisations Activity
  // - KPIs → Dashboards
  // - Import → Split to /organisations/import + /people/import
  // ✅ NEW (2025-10-18): Import Unifié → /dashboard/imports/unified
]

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const { todayCount } = useTaskViews()
  const { user, logout } = useAuth()
  const pendingSuggestionsCount = usePendingSuggestionsCount()
  const tasksDueToday = todayCount
  const isAdmin = user?.is_admin || false

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
          'shadow-2xl backdrop-blur-sm',
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

                <div className="flex items-center gap-2">
                  <ThemeToggle size="sm" className="inline-flex bg-white/10 text-white hover:bg-white/20" />
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden md:flex p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                    aria-label="Réduire le menu"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
                  </button>
                  <button
                    onClick={onClose}
                    className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Fermer le menu"
                  >
                    <X className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setCollapsed(false)}
                  className="mx-auto p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
                  aria-label="Étendre le menu"
                >
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
                <ThemeToggle size="sm" className="bg-white/10 text-white hover:bg-white/20" />
              </div>
            )}
          </div>

          {/* Daily Tasks Indicator */}
          <div className="px-3 pb-4">
            {collapsed ? (
              <Link
                href="/dashboard/tasks"
                className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 transition-all hover:scale-110 hover:shadow-xl shadow-lg group"
              >
                <Bell className="h-5 w-5 text-white group-hover:animate-pulse" />
                {tasksDueToday > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-slate-900 bg-gradient-to-br from-red-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-lg animate-pulse">
                    {tasksDueToday}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/dashboard/tasks"
                className="group relative flex items-center gap-3 rounded-xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-amber-500/20 px-4 py-3.5 transition-all hover:border-orange-400 hover:from-orange-500/30 hover:to-amber-500/30 hover:shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/20 to-orange-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-amber-500/50 group-hover:scale-110 transition-transform">
                  <Bell className="h-5 w-5 group-hover:animate-pulse" />
                  {tasksDueToday > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-slate-900 bg-gradient-to-br from-red-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-lg animate-pulse">
                      {tasksDueToday}
                    </span>
                  )}
                </div>
                <div className="flex-1 relative z-10">
                  <p className="text-xs uppercase tracking-wider text-orange-200 font-semibold">
                    Tâches du jour
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {tasksDueToday === 0 ? 'Aucune tâche' : `${tasksDueToday} à traiter`}
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {MENU_ITEMS.filter((item) => {
              // Filtrer "Utilisateurs" si pas admin
              if (item.href === '/dashboard/users' && !isAdmin) {
                return false
              }
              return true
            }).map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const isHovered = hoveredItem === item.href

              // Dynamic badge pour Agent IA
              const dynamicBadge = item.href === '/dashboard/ai' && pendingSuggestionsCount > 0
                ? pendingSuggestionsCount
                : item.badge

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={clsx(
                    'group relative flex items-center gap-3',
                    'px-3 py-3 rounded-xl',
                    'transition-all duration-300',
                    'overflow-hidden',
                    active
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-blue-500/40 scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-white/10 hover:scale-102',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Hover Effect Background */}
                  {!active && isHovered && !collapsed && (
                    <div className={clsx(
                      'absolute inset-0 bg-gradient-to-r opacity-15 animate-in fade-in duration-300',
                      item.gradient
                    )} />
                  )}

                  {/* Active shimmer effect */}
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}

                  {/* Icon Container */}
                  <div className={clsx(
                    'relative flex items-center justify-center',
                    'w-10 h-10 rounded-xl flex-shrink-0',
                    'transition-all duration-300',
                    active
                      ? 'bg-white/20 shadow-lg'
                      : 'bg-white/5 group-hover:bg-white/15 group-hover:scale-110'
                  )}>
                    <Icon
                      className={clsx(
                        'w-5 h-5 transition-all duration-300',
                        active && 'scale-110 drop-shadow-lg'
                      )}
                    />
                  </div>

                  {!collapsed && (
                    <>
                      <div className="flex-1 relative z-10">
                        <p className={clsx(
                          'text-sm font-bold transition-all duration-200',
                          active && 'drop-shadow-sm'
                        )}>
                          {item.label}
                        </p>
                        <p className={clsx(
                          'text-[11px] transition-colors duration-200',
                          active ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300'
                        )}>
                          {item.description}
                        </p>
                      </div>

                      {/* Badge */}
                      {dynamicBadge && (
                        <div className={clsx(
                          'px-2.5 py-1 rounded-lg text-xs font-bold',
                          'transition-all duration-300 shadow-sm',
                          active
                            ? 'bg-white/30 text-white shadow-lg'
                            : 'bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:scale-110'
                        )}>
                          {dynamicBadge}
                        </div>
                      )}

                      {/* Active Indicator */}
                      {active && (
                        <div className="w-1.5 h-10 bg-white rounded-full shadow-lg animate-pulse" />
                      )}
                    </>
                  )}

                  {/* Collapsed Badge */}
                  {collapsed && dynamicBadge && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg border-2 border-slate-900">
                      {dynamicBadge === 'NEW' ? '!' : dynamicBadge}
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
              href="/dashboard/settings/webhooks"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'text-slate-300 hover:text-white hover:bg-white/10',
                'transition-all duration-200',
                collapsed && 'justify-center'
              )}
            >
              <LinkIcon className="w-4 h-4" />
              {!collapsed && <span className="text-sm">Webhooks</span>}
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
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-xl border border-white/10 hover:border-white/20">
                <div className="relative group-hover:scale-110 transition-transform duration-300">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 via-emerald-500 to-blue-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-blue-200 transition-colors">
                    Admin User
                  </p>
                  <p className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors">
                    admin@tpm.finance
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={logout}
                className="mx-auto w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 via-emerald-500 to-blue-500 flex items-center justify-center relative group shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                title="Déconnexion"
              >
                <span className="text-white font-bold text-sm">A</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
