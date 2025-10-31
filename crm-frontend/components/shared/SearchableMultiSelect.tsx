// components/shared/SearchableMultiSelect.tsx
// ============= SEARCHABLE MULTI-SELECT COMPONENT =============
// Supporte la recherche distante et l'infinite scroll

'use client'

import { Search, X, ChevronDown } from 'lucide-react'
import type { SelectOption } from './SearchableSelect'
import { useSearchableDropdown } from '@/hooks/useSearchableDropdown'

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
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  maxSelection?: number
  emptyMessage?: string
  noResultsMessage?: string
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
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  maxSelection,
  emptyMessage = 'Aucune option disponible',
  noResultsMessage = 'Aucun résultat trouvé',
}: SearchableMultiSelectProps) {
  const {
    isOpen,
    searchQuery,
    setSearchQuery,
    filteredOptions,
    containerRef,
    inputRef,
    listRef,
    handleScroll,
    toggleDropdown,
  } = useSearchableDropdown({
    options,
    onSearch,
    onLoadMore,
    hasMore,
    isLoadingMore,
    enableLocalFilter: true,
    triggerSearchOnMount: true,
  })

  const selectedOptions = options.filter((opt) => value.includes(opt.id))

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

  const handleDropdownToggle = () => {
    if (disabled) return
    toggleDropdown()
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
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

      <div
        onClick={handleDropdownToggle}
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
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

          {maxSelection && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              {value.length} / {maxSelection} sélectionné{value.length > 1 ? 's' : ''}
            </div>
          )}

          <div ref={listRef} className="max-h-64 overflow-y-auto" onScroll={handleScroll}>
            {isLoading && filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Chargement...
              </div>
            ) : filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((option) => {
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
                })}
                {(hasMore || isLoadingMore) && (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">
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

