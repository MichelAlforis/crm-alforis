// ============================
// components/shared/GlobalSearchInput.tsx — version améliorée
// ============================
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { Search, Sparkles } from 'lucide-react'

interface Props {
  placeholder?: string
  className?: string
}

export default function GlobalSearchInput({ placeholder = 'Rechercher partout…', className = '' }: Props) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [value, setValue] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          inputRef.current?.focus()
        }
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
    <form
      onSubmit={onSubmit}
      className={`relative group ${className}`}
      role="search"
      aria-label="Recherche globale"
    >
      <div className={`relative transition-all duration-200 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full md:w-80 lg:w-96 h-10 rounded-xl border-2
            ${isFocused
              ? 'border-blue-500 bg-white shadow-lg shadow-blue-100'
              : 'border-gray-300 bg-gray-50/50 hover:bg-white hover:border-gray-400'
            }
            pl-11 pr-16 text-sm font-medium
            outline-none transition-all duration-200
            placeholder:text-gray-500
          `}
          aria-label="Rechercher"
        />

        {/* Icône de recherche */}
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isFocused ? 'text-blue-600' : 'text-gray-400'}`}>
          {isFocused ? (
            <Sparkles className="w-5 h-5 animate-pulse" aria-hidden />
          ) : (
            <Search className="w-5 h-5" aria-hidden />
          )}
        </div>

        {/* Raccourci clavier */}
        <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1.5">
          {value ? (
            <button
              type="button"
              onClick={() => setValue('')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Effacer
            </button>
          ) : (
            <kbd className={`
              text-[11px] font-semibold border-2 rounded-md px-1.5 py-0.5 transition-all duration-200
              ${isFocused
                ? 'text-blue-600 border-blue-500 bg-blue-50'
                : 'text-gray-500 border-gray-300 bg-white'
              }
            `}>
              /
            </kbd>
          )}
        </div>
      </div>
    </form>
  )
}
