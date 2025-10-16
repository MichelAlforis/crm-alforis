// components/shared/Navbar.tsx
// ============= NAVBAR COMPONENT =============

'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from './Button'

interface NavbarProps {
  onMenuClick?: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { logout } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm h-16 flex items-center px-6">
      <div className="flex-1 flex items-center">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
        >
          ☰
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">TPM Finance CRM</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
        >
          Déconnexion
        </Button>
      </div>
    </nav>
  )
}
