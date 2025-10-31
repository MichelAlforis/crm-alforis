// components/search/AdvancedFilters.tsx — Filtres avancés génériques pour toutes les tables
'use client'

import React, { useState } from 'react'
import { Filter, X } from 'lucide-react'

// ============= TYPES =============

export type FilterType = 'select' | 'search' | 'date' | 'multiselect' | 'boolean'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDefinition {
  key: string
  label: string
  type: FilterType
  options?: FilterOption[] // Pour select et multiselect
  placeholder?: string // Pour search
}

interface AdvancedFiltersProps {
  filters: FilterDefinition[]
  values: Record<string, string | string[]>
  onChange: (key: string, value: string | string[] | undefined) => void
  onReset: () => void
}

// ============= COMPONENT =============

export default function AdvancedFilters({
  filters,
  values,
  onChange,
  onReset,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Compte le nombre de filtres actifs
  const activeFiltersCount = Object.keys(values).filter((key) => {
    const value = values[key]
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    return true
  }).length

  const handleChange = (key: string, value: string | string[] | undefined) => {
    onChange(key, value)
  }

  const handleReset = () => {
    onReset()
  }

  // ============= RENDER FILTER INPUT =============

  const renderFilterInput = (filter: FilterDefinition) => {
    const value = values[filter.key] || ''

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleChange(filter.key, e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 outline-none bg-white dark:bg-slate-900"
          >
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'search':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(filter.key, e.target.value || undefined)}
            placeholder={filter.placeholder || 'Rechercher...'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 outline-none"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => handleChange(filter.key, e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 outline-none"
          />
        )

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filter.options?.map((option) => {
              const currentValues = (value as string[]) || []
              const isChecked = currentValues.includes(option.value)
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v) => v !== option.value)
                      handleChange(
                        filter.key,
                        newValues.length > 0 ? newValues : undefined
                      )
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">{option.label}</span>
                </label>
              )
            })}
          </div>
        )

      case 'boolean':
        return (
          <div className="flex gap-2">
            {filter.options?.map((option) => {
              const isSelected = value === option.value
              return (
                <button
                  key={option.value}
                  onClick={() =>
                    handleChange(filter.key, isSelected ? undefined : option.value)
                  }
                  className={`
                    flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800'
                    }
                  `}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )

      default:
        return null
    }
  }

  // ============= RENDER =============

  return (
    <div className="relative">
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
          ${
            activeFiltersCount > 0
              ? 'border-blue-600 text-blue-700 bg-blue-50'
              : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800'
          }
        `}
      >
        <Filter className="w-4 h-4" />
        Filtres
        {activeFiltersCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Panneau de filtres */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtres avancés
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {filters.map((filter) => (
                <div key={filter.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {filter.label}
                  </label>
                  {renderFilterInput(filter)}
                </div>
              ))}

              {filters.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucun filtre disponible
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => {
                  handleReset()
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:bg-slate-800 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                Appliquer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
