// components/shared/Sidebar.tsx - UPDATED
// ============= SIDEBAR COMPONENT - UPDATED WITH FOURNISSEURS =============

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface SidebarProps {
  isOpen?: boolean
}

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Investisseurs', href: '/dashboard/investors', icon: '👥' },
  { label: 'Fournisseurs', href: '/dashboard/fournisseurs', icon: '🏢' },
  { label: 'Interactions', href: '/dashboard/interactions', icon: '📞' },
  { label: 'KPIs', href: '/dashboard/kpis', icon: '📈' },
]

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname()

  /**
   * Vérifie si une route est active
   */
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 md:hidden z-30" aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed md:relative z-40 h-screen w-64 bg-ardoise text-white',
          'transition-transform duration-300 ease-in-out',
          'flex flex-col',
          !isOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-white/20">
          <h1 className="text-xl font-bold text-white">TPM Finance</h1>
          <p className="text-xs text-gray-300 mt-1">CRM Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 space-y-2">
          {MENU_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3',
                  'rounded-lg transition-all duration-200',
                  'border-l-4',
                  active
                    ? 'bg-bleu text-white border-white shadow-md'
                    : 'text-gray-200 hover:bg-black/20 border-transparent hover:border-white/30'
                )}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <p className="text-xs text-gray-400 text-center">
            © 2024 TPM Finance
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            v1.0.0
          </p>
        </div>
      </aside>
    </>
  )
}