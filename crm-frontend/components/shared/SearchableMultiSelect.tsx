// components/shared/SearchableMultiSelect.tsx
// ============= SEARCHABLE MULTI-SELECT COMPONENT =============
// Composant de sélection multiple avec recherche
// Utilisé pour fournisseurs, tags, etc.

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export interface SelectOption {
  id: number
  label: string
  sublabel?: string
}

interface SearchableMultiSelectProps {
  options: SelectOption[]
  value: number[]
  onChange: (value: number[]) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  onSearch?: (query: string) => void
  isLoading?: boolean
  maxSelection?: number
}

export function SearchableMultiSelect({
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
  maxSelection,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtrer les options localement
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Trouver les options sélectionnées
  const selectedOptions = options.filter((opt) => value.includes(opt.id))

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

  const handleToggle = (optionId: number) => {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId))
    } else {
      if (maxSelection && value.length >= maxSelection) {
        return
      }
      onChange([...value, optionId])
    }
  }

  const handleRemove = (optionId: number) => {
    onChange(value.filter((id) => id !== optionId))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const handleToggleDropdown = () => {
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

      {/* Trigger button with selected items */}
      <div
        onClick={handleToggleDropdown}
        className={`
          w-full min-h-[44px] px-3 py-2 border rounded-lg bg-white
          cursor-pointer transition-colors
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {selectedOptions.length > 0 ? (
            <>
              {selectedOptions.map((option) => (
                <span
                  key={option.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                >
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(option.id)
                    }}
                    className="hover:bg-blue-200 rounded p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearAll()
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Tout effacer
                </button>
              )}
            </>
          ) : (
            <span className="text-gray-500 text-sm">{placeholder}</span>
          )}
          <div className="ml-auto">
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

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
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Selection info */}
          {maxSelection && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              {value.length} / {maxSelection} sélectionné{value.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Chargement...
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.id)
                const isDisabled = maxSelection
                  ? !isSelected && value.length >= maxSelection
                  : false

                return (
                  <label
                    key={option.id}
                    className={`
                      flex items-center gap-3 px-4 py-2 cursor-pointer
                      transition-colors
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}
                      ${isSelected ? 'bg-blue-50' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => !isDisabled && handleToggle(option.id)}
                      disabled={isDisabled}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{option.label}</div>
                      {option.sublabel && (
                        <div className="text-xs text-gray-500">{option.sublabel}</div>
                      )}
                    </div>
                  </label>
                )
              })
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
