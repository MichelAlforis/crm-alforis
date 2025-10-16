// components/shared/Sidebar.tsx
// ============= MODERN SIDEBAR COMPONENT =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  TrendingUp,
  ChevronLeft,
  Menu,
  X,
  Settings,
  LogOut,
  HelpCircle,
} from 'lucide-react'

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
  },
  {
    label: 'Investisseurs',
    href: '/dashboard/investors',
    icon: Users,
    description: 'Gestion des clients',
  },
  {
    label: 'Fournisseurs',
    href: '/dashboard/fournisseurs',
    icon: Building2,
    description: 'Partenaires FSS',
  },
  {
    label: 'Interactions',
    href: '/dashboard/interactions',
    icon: MessageSquare,
    description: 'Historique des échanges',
  },
  {
    label: 'KPIs',
    href: '/dashboard/kpis',
    icon: TrendingUp,
    description: 'Métriques et analyses',
  },
]

const SECONDARY_ITEMS = [
  {
    label: 'Paramètres',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    label: 'Aide',
    href: '/dashboard/help',
    icon: HelpCircle,
  },
]

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Check if route is active
  const isActive = (href: string): boolean => {
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
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed md:sticky top-0 z-40 h-screen',
          'bg-foreground border-r border-border',
          'transition-all duration-base',
          'flex flex-col',
          collapsed ? 'w-20' : 'w-64',
          !isOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="h-16 px-spacing-md flex items-center justify-between border-b border-border">
          {!collapsed && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-radius-md bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <div>
                  <h1 className="text-base font-bold text-text-primary">
                    TPM Finance
                  </h1>
                  <p className="text-xs text-text-muted">CRM Portal</p>
                </div>
              </div>
              
              {/* Collapse button (desktop) */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden md:flex p-1.5 hover:bg-muted rounded-radius-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              
              {/* Close button (mobile) */}
              <button
                onClick={onClose}
                className="md:hidden p-1.5 hover:bg-muted rounded-radius-sm transition-colors"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </>
          )}
          
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="mx-auto p-1.5 hover:bg-muted rounded-radius-sm transition-colors"
            >
              <Menu className="w-4 h-4 text-text-secondary" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-spacing-sm py-spacing-md space-y-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'group flex items-center gap-3',
                  'px-spacing-sm py-2.5 rounded-radius-md',
                  'transition-all duration-base',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-muted',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon 
                  className={clsx(
                    'flex-shrink-0',
                    collapsed ? 'w-5 h-5' : 'w-4 h-4'
                  )} 
                />
                
                {!collapsed && (
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {item.label}
                    </p>
                    {!active && (
                      <p className="text-xs opacity-75">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Active indicator */}
                {active && !collapsed && (
                  <div className="ml-auto w-1 h-4 bg-white/50 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="px-spacing-sm py-spacing-sm border-t border-border space-y-1">
          {SECONDARY_ITEMS.map((item) => {
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3',
                  'px-spacing-sm py-2 rounded-radius-md',
                  'text-text-secondary hover:text-text-primary hover:bg-muted',
                  'transition-all duration-base',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm">{item.label}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="px-spacing-md py-spacing-sm border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  Admin User
                </p>
                <p className="text-xs text-text-muted truncate">
                  admin@tpmfinance.com
                </p>
              </div>
              <button 
                className="p-1.5 hover:bg-muted rounded-radius-sm transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}