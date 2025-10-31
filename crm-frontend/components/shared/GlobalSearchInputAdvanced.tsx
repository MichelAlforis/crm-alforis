// ============================
// components/shared/GlobalSearchInputAdvanced.tsx — Recherche en temps réel avec toutes les fonctionnalités
// ============================
'use client'
import { logger } from '@/lib/logger'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, Clock, X, Loader2, TrendingUp } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { storage } from '@/lib/constants'

interface Props {
  placeholder?: string
  className?: string
}

interface QuickResult {
  id: string
  type: string
  title: string
  subtitle?: string
  href: string
}

interface SearchHistory {
  query: string
  timestamp: number
}

const STORAGE_KEY = 'crm_search_history'
const MAX_HISTORY = 5
const TYPE_LABELS: Record<string, string> = {
  fournisseur: 'Fournisseur',
  investisseur: 'Investisseur',
  person: 'Personne',
  contact: 'Interaction',
  opportunite: 'Opportunité',
  kpi: 'KPI',
  info: 'Info',
}

export default function GlobalSearchInputAdvanced({
  placeholder = 'Rechercher partout…',
  className = ''
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [quickResults, setQuickResults] = useState<QuickResult[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const debouncedValue = useDebounce(value, 300)

  // Charger l'historique au mount
  useEffect(() => {
    try {
      const stored = storage.get<SearchHistory[]>(STORAGE_KEY)
      if (stored) {
        setSearchHistory(stored)
      }
    } catch (e) {
      logger.error('Error loading search history:', e)
    }
  }, [])

  // Raccourci clavier Cmd+K ou Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Sauvegarder une recherche dans l'historique
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return

    const newHistory = [
      { query, timestamp: Date.now() },
      ...searchHistory.filter(h => h.query !== query)
    ].slice(0, MAX_HISTORY)

    setSearchHistory(newHistory)
    storage.set(STORAGE_KEY, newHistory)
  }, [searchHistory])

  // Effacer l'historique
  const clearHistory = useCallback(() => {
    setSearchHistory([])
    storage.remove(STORAGE_KEY)
  }, [])

  // Recherche en temps réel
  useEffect(() => {
    if (debouncedValue.trim().length < 2) {
      setQuickResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    fetch(`/api/search?q=${encodeURIComponent(debouncedValue)}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        setQuickResults(data.results?.slice(0, 5) || [])
        setIsLoading(false)
      })
      .catch(err => {
        logger.error('Search error:', err)
        setQuickResults([])
        setIsLoading(false)
      })
  }, [debouncedValue])

  // Gestion du clavier "/"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
      // Escape pour fermer le dropdown
      if (e.key === 'Escape') {
        setShowDropdown(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return

    saveToHistory(q)
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`)
    inputRef.current?.blur()
    setShowDropdown(false)
  }

  function handleResultClick(href: string, title: string) {
    saveToHistory(value || title)
    router.push(href)
    setShowDropdown(false)
    setValue('')
  }

  function handleHistoryClick(query: string) {
    setValue(query)
    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`)
    setShowDropdown(false)
  }

  const shouldShowDropdown = showDropdown && isFocused && (
    quickResults.length > 0 ||
    isLoading ||
    (searchHistory.length > 0 && value.length === 0)
  )

  return (
    <div className={`relative ${className}`}>
      <form
        onSubmit={onSubmit}
        className="relative group"
        role="search"
        aria-label="Recherche globale"
      >
        <div className={`relative transition-all duration-200 ${isFocused ? 'scale-[1.02]' : ''}`}>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true)
              setShowDropdown(true)
            }}
            onBlur={() => {
              // Délai pour permettre le clic sur les résultats
              setTimeout(() => setIsFocused(false), 200)
            }}
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
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : isFocused ? (
              <Sparkles className="w-5 h-5 animate-pulse" aria-hidden />
            ) : (
              <Search className="w-5 h-5" aria-hidden />
            )}
          </div>

          {/* Raccourci clavier ou bouton effacer */}
          <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1.5">
            {!isFocused && !value && (
              <kbd className="px-2 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded shadow-sm">
                {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K
              </kbd>
            )}
            {value ? (
              <button
                type="button"
                onClick={() => setValue('')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Effacer"
              >
                <X className="w-4 h-4" />
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

      {/* Dropdown avec résultats rapides et historique */}
      {shouldShowDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full md:w-[32rem] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Résultats de recherche en temps réel */}
          {quickResults.length > 0 && (
            <div className="max-h-96 overflow-y-auto">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Résultats rapides
              </div>
              {quickResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.href, result.title)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 focus:bg-blue-50 focus:outline-none"
                >
                  <div className="font-medium text-gray-900 text-sm">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-xs text-gray-500 mt-0.5">{result.subtitle}</div>
                  )}
                  <div className="text-xs text-blue-600 mt-1 capitalize">
                    {TYPE_LABELS[result.type] || result.type}
                  </div>
                </button>
              ))}
              {quickResults.length > 0 && (
                <button
                  onClick={() => {
                    onSubmit(new Event('submit') as any)
                  }}
                  className="w-full px-4 py-2 text-sm text-center text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                >
                  Voir tous les résultats →
                </button>
              )}
            </div>
          )}

          {/* Loader */}
          {isLoading && quickResults.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Recherche en cours...</p>
            </div>
          )}

          {/* Historique de recherche */}
          {searchHistory.length > 0 && value.length === 0 && !isLoading && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Recherches récentes
                </div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-600 hover:text-red-700 font-normal normal-case"
                >
                  Effacer
                </button>
              </div>
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleHistoryClick(item.query)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3 focus:bg-gray-50 focus:outline-none"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{item.query}</span>
                </button>
              ))}
            </div>
          )}

          {/* Aucun résultat */}
          {!isLoading && quickResults.length === 0 && value.length >= 2 && (
            <div className="px-4 py-6 text-center text-gray-500">
              <p className="text-sm">Aucun résultat pour "{value}"</p>
              <p className="text-xs mt-1">Appuyez sur Entrée pour une recherche complète</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
