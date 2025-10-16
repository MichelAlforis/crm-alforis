// ============================
// 1) components/search/GlobalSearchInput.tsx
// ============================
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Props {
  placeholder?: string
  className?: string
}

export default function GlobalSearchInput({ placeholder = 'Rechercher (/)…', className = '' }: Props) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [value, setValue] = React.useState('')

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`)
    inputRef.current?.blur()
  }

  return (
    <form onSubmit={onSubmit} className={`relative ${className}`} role="search" aria-label="Recherche globale">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full md:w-72 lg:w-96 h-9 rounded-lg border border-gray-300 bg-white pl-9 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-300"
        aria-label="Rechercher"
      />
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden />
      <kbd className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 border border-gray-300 rounded px-1">/</kbd>
    </form>
  )
}
