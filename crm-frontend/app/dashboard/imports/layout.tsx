// app/imports/layout.tsx
'use client'

import Link from 'next/link'
import { useSelectedLayoutSegments } from 'next/navigation'
import React from 'react'

export default function ImportsLayout({ children }: { children: React.ReactNode }) {
  const segments = useSelectedLayoutSegments()
  // segments pour /imports/investors => ['investors']
  const active = segments?.[0] === 'fournisseurs' ? 'fournisseurs' : 'investors'

  const Tab = ({ href, label, isActive }: { href: string; label: string; isActive: boolean }) => (
    <Link
      href={href}
      className={[
        'px-3 py-1.5 rounded-md text-sm border transition-colors',
        isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </Link>
  )

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Imports</h1>
        <p className="text-gray-600 mt-1">Importez en masse investisseurs et fournisseurs.</p>
      </header>

      <nav className="flex gap-2">
        <Tab href="/dashboard/imports/investors" label="Investisseurs" isActive={active === 'investors'} />
        <Tab href="/dashboard/imports/fournisseurs" label="Fournisseurs" isActive={active === 'fournisseurs'} />
      </nav>

      <section>{children}</section>
    </div>
  )
}
