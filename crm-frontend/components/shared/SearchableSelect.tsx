// components/shared/SearchableSelect.tsx
// ============= SEARCHABLE SELECT COMPONENT =============
// Composant de sélection avec recherche pour améliorer l'UX
// Utilisé pour organisations, personnes, etc.

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export interface SelectOption {
  id: number
  label: string
  sublabel?: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value?: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  onSearch?: (query: string) => void
  isLoading?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  label,
  required = false,
  disabled = false,
  error,
  onSearch,
  isLoading = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtrer les options localement
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Trouver l'option sélectionnée
  const selectedOption = value ? options.find((opt) => opt.id === value) : null

  // Gérer le clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Gérer la recherche avec debounce
  useEffect(() => {
    if (onSearch && searchQuery) {
      const timer = setTimeout(() => {
        onSearch(searchQuery)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, onSearch])

  // Gérer la navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery('')
        break
    }
  }

  const handleSelect = (optionId: number) => {
    onChange(optionId)
    setIsOpen(false)
    setSearchQuery('')
    setHighlightedIndex(0)
  }

  const handleClear = () => {
    onChange(null)
    setSearchQuery('')
  }

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left border rounded-lg bg-white
          flex items-center justify-between gap-2
          transition-colors
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Chargement...
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`
                    w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors
                    ${index === highlightedIndex ? 'bg-blue-50' : ''}
                    ${option.id === value ? 'bg-blue-100 font-medium' : ''}
                  `}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="text-sm text-gray-900">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-gray-500">{option.sublabel}</div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                Aucun résultat trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
