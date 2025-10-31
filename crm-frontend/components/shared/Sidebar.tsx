// components/shared/Sidebar.tsx
// ============= ULTRA MODERN SIDEBAR =============

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import clsx from 'clsx'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  LogOut,
  Bell,
  Star,
} from 'lucide-react'
import { useTaskViews } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { usePendingSuggestionsCount } from '@/hooks/useAI'
import { useSidebar } from '@/hooks/useSidebar'
import type { FavoriteSidebarItem, SidebarSection, SidebarItem } from '@/hooks/useSidebar'
import { useSidebarAnalytics } from '@/hooks/useSidebarAnalytics'
import { SIDEBAR_SECTIONS } from '@/config/sidebar.config'
import ThemeToggle from '@/components/shared/ThemeToggle'

// ✅ Configuration externalisée dans config/sidebar.config.ts
// Permet tests unitaires et réutilisation
const MENU_ITEMS = SIDEBAR_SECTIONS

// Composant Popover pour les sous-menus en mode collapsed
type SidebarHook = ReturnType<typeof useSidebar>

function SubmenuPopover({
  item,
  triggerRef,
  onMouseEnter,
  onMouseLeave,
  sidebar,
}: {
  item: SidebarSection
  triggerRef: React.RefObject<HTMLDivElement>
  onMouseEnter: () => void
  onMouseLeave: () => void
  sidebar: SidebarHook
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const submenuItems = item.submenu ?? []

  useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top,
        left: rect.right + 16 // 16px gap
      })
    }
  }, [triggerRef])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="min-w-[240px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 animate-in fade-in slide-in-from-left-2 duration-150">
        {/* Header */}
        <div className="px-2 py-2 border-b border-slate-700 mb-2">
          <p className="text-sm font-bold text-white">{item.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
        </div>
        {/* Submenu Items */}
        <div className="space-y-1">
          {submenuItems.map((subItem) => {
            const SubIcon = subItem.icon
            const subActive = sidebar.isActive(subItem.href)
            return (
              <Link
                key={subItem.href}
                href={subItem.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  subActive
                    ? 'bg-blue-600 text-white font-semibold shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                )}
              >
                <SubIcon className="w-4 h-4" />
                <span className="text-sm">{subItem.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const itemRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({})
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ État partagé via Zustand
  const sidebar = useSidebar(SIDEBAR_SECTIONS)

  // 📊 Phase 4: Analytics & tracking
  const analytics = useSidebarAnalytics()

  // Fonction pour gérer le hover avec délai
  const handleMouseEnter = (href: string) => {
    // Annuler tout timeout de fermeture en cours
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setHoveredItem(href)
  }

  const handleMouseLeave = () => {
    // Ajouter un délai avant de fermer pour permettre de passer au popover
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null)
    }, 200) // 200ms de délai
  }

  const { todayCount } = useTaskViews()
  const { user, logout } = useAuth()
  const pendingSuggestionsCount = usePendingSuggestionsCount()
  const tasksDueToday = todayCount
  const isAdmin = user?.is_admin || false

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebar.mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-30 animate-in fade-in duration-200"
          onClick={sidebar.closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:relative top-0 left-0 z-40',
          'h-screen flex-shrink-0',
          'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
          'border-r border-white/10',
          'transition-all duration-300 ease-in-out',
          'flex flex-col',
          'shadow-2xl backdrop-blur-sm',
          sidebar.collapsed ? 'w-20' : 'w-72',
          !sidebar.mobileOpen && sidebar.isMobile && '-translate-x-full lg:translate-x-0'
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
            {!sidebar.collapsed ? (
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
                  <ThemeToggle size="sm" className="inline-flex bg-white dark:bg-slate-900/10 text-white hover:bg-white/20" />
                  <button
                    onClick={sidebar.toggleCollapsed}
                    className="hidden lg:flex p-2 hover:bg-white dark:bg-slate-900/10 rounded-lg transition-all duration-200 group"
                    aria-label="Réduire le menu"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
                  </button>
                  <button
                    onClick={sidebar.closeMobile}
                    className="lg:hidden p-2 hover:bg-white dark:bg-slate-900/10 rounded-lg transition-colors"
                    aria-label="Fermer le menu"
                  >
                    <X className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={sidebar.toggleCollapsed}
                  className="mx-auto p-2 hover:bg-white dark:bg-slate-900/10 rounded-lg transition-all duration-200"
                  aria-label="Étendre le menu"
                >
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
                <ThemeToggle size="sm" className="bg-white dark:bg-slate-900/10 text-white hover:bg-white/20" />
              </div>
            )}
          </div>

          {/* Daily Tasks Indicator */}
          <div className="px-3 pb-4">
            {sidebar.collapsed ? (
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
            {/* ⭐ SECTION FAVORIS */}
            {sidebar.favoriteItems.length > 0 && !sidebar.collapsed && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Favoris ({sidebar.favoriteItems.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {sidebar.favoriteItems.map((item: FavoriteSidebarItem) => {
                    const Icon = item.data.icon
                    const active = sidebar.isActive(item.data.href)
                    const isSubitem = item.type === 'subitem'

                    return (
                      <Link
                        key={`fav-${item.data.href}`}
                        href={item.data.href}
                        onClick={() => analytics.trackClick(item.data.href, item.data.label)}
                        className={clsx(
                          'group relative flex items-center gap-3',
                          'px-3 py-2.5 rounded-xl',
                          'transition-all duration-300',
                          active
                            ? 'bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 text-white shadow-xl shadow-yellow-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-yellow-500/10 border border-yellow-500/20'
                        )}
                      >
                        <div className={clsx(
                          'relative flex items-center justify-center',
                          'rounded-lg flex-shrink-0',
                          'transition-all duration-300',
                          isSubitem ? 'w-6 h-6' : 'w-8 h-8',
                          active ? 'bg-white dark:bg-slate-900/20' : 'bg-yellow-500/10'
                        )}>
                          <Icon className={clsx(isSubitem ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={clsx(
                            'font-semibold block',
                            isSubitem ? 'text-xs' : 'text-sm'
                          )}>
                            {item.data.label}
                          </span>
                          {isSubitem && (
                            <span className="text-[10px] text-slate-400 truncate block">
                              {item.data.parentLabel}
                            </span>
                          )}
                        </div>
                        <Star className={clsx(
                          'text-yellow-400 fill-yellow-400',
                          isSubitem ? 'w-3.5 h-3.5' : 'w-4 h-4'
                        )} />
                      </Link>
                    )
                  })}
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-3" />
              </div>
            )}

            {/* TOUTES LES SECTIONS */}
            {MENU_ITEMS.filter((item) => {
              // Filtrer "Utilisateurs" si pas admin
              if (item.href === '/dashboard/users' && !isAdmin) {
                return false
              }
              return true
            }).map((item) => {
              const Icon = item.icon
              const active = sidebar.isActive(item.href)
              const isHovered = hoveredItem === item.href
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const submenuOpen = sidebar.isSubmenuOpen(item.href)

              // Créer un ref pour cet item si pas déjà créé
              if (!itemRefs.current[item.href]) {
                itemRefs.current[item.href] = React.createRef<HTMLDivElement>()
              }
              const itemRef = itemRefs.current[item.href]

              // Dynamic badge pour Agent IA
              const dynamicBadge = item.href === '/dashboard/ai' && pendingSuggestionsCount > 0
                ? pendingSuggestionsCount
                : item.badge

              const isFav = sidebar.isFavorite(item.href)

              // Ajouter data-tour attributes pour onboarding
              const getTourAttribute = () => {
                if (item.href === '/dashboard/crm') return 'crm-section'
                if (item.href === '/dashboard/automation') return 'automation-section'
                if (item.href === '/dashboard/marketing') return 'marketing-section'
                if (item.href === '/dashboard/ai') return 'ai-link'
                if (item.href === '/dashboard/workflows') return 'workflows-link'
                if (item.label === 'Centre d\'aide' || item.href === '/dashboard/help') return 'help-link'
                return undefined
              }

              return (
                <div key={item.href} data-tour={getTourAttribute()}>
                  {/* Parent Item with Submenu - Expanded */}
                  {hasSubmenu && !sidebar.collapsed ? (
                    <div className="relative group/item">
                      <button
                        onClick={() => sidebar.toggleSubmenu(item.href)}
                        onMouseEnter={() => setHoveredItem(item.href)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={clsx(
                          'group relative flex items-center gap-3 w-full',
                          'px-3 py-3 rounded-xl',
                          'transition-all duration-300',
                          'overflow-hidden',
                          active
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-blue-500/40 scale-105'
                            : 'text-slate-300 hover:text-white hover:bg-white dark:bg-slate-900/10 hover:scale-102'
                        )}
                      >
                        {/* Hover Effect Background */}
                        {!active && isHovered && (
                          <div className={clsx(
                            'absolute inset-0 bg-gradient-to-r opacity-15 animate-in fade-in duration-300',
                            item.gradient
                          )} />
                        )}

                        {/* Icon Container */}
                        <div className={clsx(
                          'relative flex items-center justify-center',
                          'w-10 h-10 rounded-xl flex-shrink-0',
                          'transition-all duration-300',
                          active
                            ? 'bg-white dark:bg-slate-900/20 shadow-lg'
                            : 'bg-white dark:bg-slate-900/5 group-hover:bg-white/15 group-hover:scale-110'
                        )}>
                          <Icon className={clsx('w-5 h-5 transition-all duration-300', active && 'scale-110 drop-shadow-lg')} />
                        </div>

                        <div className="flex-1 relative z-10">
                          <p className={clsx('text-sm font-bold transition-all duration-200', active && 'drop-shadow-sm')}>
                            {item.label}
                          </p>
                          <p className={clsx('text-[11px] transition-colors duration-200', active ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300')}>
                            {item.description}
                          </p>
                        </div>

                        {/* Chevron */}
                        <ChevronDown className={clsx('w-4 h-4 transition-transform duration-300', submenuOpen && 'rotate-180')} />
                      </button>

                      {/* Bouton Favori (étoile) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          sidebar.toggleFavorite(item.href)
                        }}
                        className={clsx(
                          'absolute top-2 left-2 z-20',
                          'p-1.5 rounded-lg transition-all duration-200',
                          'opacity-0 group-hover/item:opacity-100',
                          isFav && 'opacity-100',
                          'hover:bg-white dark:bg-slate-900/20 hover:scale-110'
                        )}
                        title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Star
                          className={clsx(
                            'w-4 h-4 transition-all',
                            isFav ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'
                          )}
                        />
                      </button>
                    </div>
                  ) : hasSubmenu && sidebar.collapsed ? (
                    // Parent Item with Submenu - Collapsed (show popover on hover)
                    <div className="relative group/item">
                      <div
                        ref={itemRef}
                        onMouseEnter={() => handleMouseEnter(item.href)}
                        onMouseLeave={handleMouseLeave}
                        className={clsx(
                          'relative flex items-center justify-center',
                          'w-10 h-10 mx-auto rounded-xl',
                          'transition-all duration-300 cursor-pointer',
                          active
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl'
                            : 'bg-white dark:bg-slate-900/5 text-slate-300 hover:bg-white/15 hover:text-white'
                        )}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Popover Submenu via Portal */}
                      {isHovered && (
                        <SubmenuPopover
                          item={item}
                          triggerRef={itemRef}
                          onMouseEnter={() => handleMouseEnter(item.href)}
                          onMouseLeave={handleMouseLeave}
                          sidebar={sidebar}
                        />
                      )}
                    </div>
                  ) : (
                    // Simple Item (no submenu)
                    <div className="relative group/item">
                      <Link
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
                            : 'text-slate-300 hover:text-white hover:bg-white dark:bg-slate-900/10 hover:scale-102',
                          sidebar.collapsed && 'justify-center'
                        )}
                        title={sidebar.collapsed ? item.label : undefined}
                      >
                        {/* Hover Effect Background */}
                        {!active && isHovered && !sidebar.collapsed && (
                          <div className={clsx('absolute inset-0 bg-gradient-to-r opacity-15 animate-in fade-in duration-300', item.gradient)} />
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
                          active ? 'bg-white dark:bg-slate-900/20 shadow-lg' : 'bg-white/5 group-hover:bg-white/15 group-hover:scale-110'
                        )}>
                          <Icon className={clsx('w-5 h-5 transition-all duration-300', active && 'scale-110 drop-shadow-lg')} />
                        </div>

                        {!sidebar.collapsed && (
                          <>
                            <div className="flex-1 relative z-10">
                              <p className={clsx('text-sm font-bold transition-all duration-200', active && 'drop-shadow-sm')}>
                                {item.label}
                              </p>
                              <p className={clsx('text-[11px] transition-colors duration-200', active ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300')}>
                                {item.description}
                              </p>
                            </div>

                            {/* Badge */}
                            {dynamicBadge && (
                              <div className={clsx(
                                'px-2.5 py-1 rounded-lg text-xs font-bold',
                                'transition-all duration-300 shadow-sm',
                                active ? 'bg-white dark:bg-slate-900/30 text-white shadow-lg' : 'bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:scale-110'
                              )}>
                                {dynamicBadge}
                              </div>
                            )}

                            {/* Active Indicator */}
                            {active && <div className="w-1.5 h-10 bg-white dark:bg-slate-900 rounded-full shadow-lg animate-pulse" />}
                          </>
                        )}

                        {/* Collapsed Badge */}
                        {sidebar.collapsed && dynamicBadge && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg border-2 border-slate-900">
                            {dynamicBadge === 'NEW' ? '!' : dynamicBadge}
                          </div>
                        )}
                      </Link>

                      {/* Bouton Favori (étoile) - Simple items */}
                      {!sidebar.collapsed && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            sidebar.toggleFavorite(item.href)
                          }}
                          className={clsx(
                            'absolute top-2 left-2 z-20',
                            'p-1.5 rounded-lg transition-all duration-200',
                            'opacity-0 group-hover/item:opacity-100',
                            isFav && 'opacity-100',
                            'hover:bg-white dark:bg-slate-900/20 hover:scale-110'
                          )}
                          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Star
                            className={clsx(
                              'w-4 h-4 transition-all',
                              isFav ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'
                            )}
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Submenu Items */}
                  {hasSubmenu && submenuOpen && !sidebar.collapsed && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-white/10 pl-3">
                      {item.submenu.map((subItem: any) => {
                        const SubIcon = subItem.icon
                        // ✅ Utiliser sidebar.isActive() au lieu de pathname direct
                        const subActive = sidebar.isActive(subItem.href)
                        const isSubFav = sidebar.isFavorite(subItem.href)

                        return (
                          <div key={subItem.href} className="relative group/subitem">
                            <Link
                              href={subItem.href}
                              className={clsx(
                                'flex items-center gap-2 px-3 py-2 rounded-lg',
                                'transition-all duration-200',
                                subActive
                                  ? 'bg-white dark:bg-slate-900/20 text-white font-semibold shadow-lg'
                                  : 'text-slate-400 hover:text-white hover:bg-white dark:bg-slate-900/10'
                              )}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span className="text-sm flex-1">{subItem.label}</span>
                            </Link>

                            {/* Bouton Favori (étoile) pour sous-items */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                sidebar.toggleFavorite(subItem.href)
                              }}
                              className={clsx(
                                'absolute top-1.5 right-1.5 z-20',
                                'p-1 rounded transition-all duration-200',
                                'opacity-0 group-hover/subitem:opacity-100',
                                isSubFav && 'opacity-100',
                                'hover:bg-white dark:bg-slate-900/20 hover:scale-110'
                              )}
                              title={isSubFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                              <Star
                                className={clsx(
                                  'w-3.5 h-3.5 transition-all',
                                  isSubFav ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'
                                )}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="px-3">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Secondary Navigation - vide maintenant, tout est dans le menu principal */}

          {/* Footer - User Profile */}
          <div className="px-3 py-4 border-t border-white/10">
            {!sidebar.collapsed ? (
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
                  className="p-2 hover:bg-white dark:bg-slate-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
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
