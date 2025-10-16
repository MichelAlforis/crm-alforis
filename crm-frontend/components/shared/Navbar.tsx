
// ============================
// 4) Intégration dans Navbar
// ============================
'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '../shared/Button'
import GlobalSearchInput from '@/components/shared/GlobalSearchInput'

interface NavbarProps {
  onMenuClick?: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { logout } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm h-16 flex items-center px-3 sm:px-4">
      <div className="flex-1 flex items-center gap-2">
        <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-lg md:hidden" aria-label="Ouvrir le menu">
          ☰
        </button>
        <div className="hidden md:block w-full max-w-lg">
          <GlobalSearchInput />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="md:hidden w-44">
          <GlobalSearchInput placeholder="Rechercher…" />
        </div>
        <span className="hidden sm:inline text-sm text-gray-600">TPM Finance CRM</span>
        <Button variant="ghost" size="sm" onClick={() => logout()}>
          Déconnexion
        </Button>
      </div>
    </nav>
  )
}
