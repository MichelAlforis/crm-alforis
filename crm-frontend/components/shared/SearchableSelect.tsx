// components/shared/SearchableSelect.tsx
// ============= SEARCHABLE SELECT COMPONENT =============
// Composant de sélection avec recherche + infinite scroll

'use client'

import { Search, X, ChevronDown } from 'lucide-react'
import { useSearchableDropdown } from '@/hooks/useSearchableDropdown'

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
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  emptyMessage?: string
  noResultsMessage?: string
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
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  emptyMessage = 'Aucune option disponible',
  noResultsMessage = 'Aucun résultat trouvé',
}: SearchableSelectProps) {
  const {
    isOpen,
    searchQuery,
    setSearchQuery,
    filteredOptions,
    highlightedIndex,
    setHighlightedIndex,
    containerRef,
    inputRef,
    listRef,
    handleScroll,
    toggleDropdown,
    closeDropdown,
    clearSearch,
  } = useSearchableDropdown({
    options,
    onSearch,
    onLoadMore,
    hasMore,
    isLoadingMore,
    enableLocalFilter: true,
    triggerSearchOnMount: true,
  })

  const selectedOption = value ? options.find((opt) => opt.id === value) : null

  // Navigation clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleDropdown()
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
        closeDropdown()
        break
    }
  }

  const handleSelect = (optionId: number) => {
    onChange(optionId)
    closeDropdown()
  }

  const handleClear = () => {
    onChange(null)
    clearSearch()
  }

  const handleToggle = () => {
    if (disabled) return
    toggleDropdown()
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left border rounded-lg bg-white dark:bg-slate-900
          flex items-center justify-between gap-2
          transition-colors
          ${disabled ? 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed' : 'hover:border-gray-400'}
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-slate-100' : 'text-gray-500'}>
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-64 overflow-y-auto" onScroll={handleScroll}>
            {isLoading && filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Chargement...
              </div>
            ) : filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((option, index) => (
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
                    <div className="text-sm text-gray-900 dark:text-slate-100">{option.label}</div>
                    {option.sublabel && (
                      <div className="text-xs text-gray-500">{option.sublabel}</div>
                    )}
                  </button>
                ))}
                {(hasMore || isLoadingMore) && (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 dark:bg-slate-800">
                    {isLoadingMore
                      ? 'Chargement...'
                      : 'Faites défiler pour charger plus'}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {options.length === 0 ? emptyMessage : noResultsMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
