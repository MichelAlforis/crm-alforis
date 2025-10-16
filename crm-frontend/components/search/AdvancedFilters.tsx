// components/search/AdvancedFilters.tsx — Filtres avancés pour la recherche
'use client'

import React, { useState } from 'react'
import { Filter, X, Calendar, CheckCircle, XCircle } from 'lucide-react'

interface AdvancedFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void
}

export interface SearchFilters {
  dateFrom?: string
  dateTo?: string
  status?: string
  types?: string[]
}

export default function AdvancedFilters({ onFiltersChange }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})

  const types = [
    { id: 'fournisseur', label: 'Fournisseurs' },
    { id: 'investisseur', label: 'Investisseurs' },
    { id: 'contact', label: 'Interactions' },
    { id: 'kpi', label: 'KPIs' },
  ]

  const statuses = [
    { id: 'active', label: 'Actif', icon: CheckCircle, color: 'text-green-600' },
    { id: 'inactive', label: 'Inactif', icon: XCircle, color: 'text-gray-600' },
  ]

  function updateFilter(key: keyof SearchFilters, value: any) {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  function toggleType(typeId: string) {
    const currentTypes = filters.types || []
    const newTypes = currentTypes.includes(typeId)
      ? currentTypes.filter(t => t !== typeId)
      : [...currentTypes, typeId]
    updateFilter('types', newTypes.length > 0 ? newTypes : undefined)
  }

  function clearFilters() {
    setFilters({})
    onFiltersChange({})
  }

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof SearchFilters]
    return value !== undefined && value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  }).length

  return (
    <div className="relative">
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
          ${activeFiltersCount > 0
            ? 'border-blue-600 text-blue-700 bg-blue-50'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtres avancés
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Filtre par date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Période
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Date de début"
                  />
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Date de fin"
                  />
                </div>
              </div>

              {/* Filtre par type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de résultat
                </label>
                <div className="space-y-2">
                  {types.map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.types?.includes(type.id) || false}
                        onChange={() => toggleType(type.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtre par statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <div className="flex gap-2">
                  {statuses.map((status) => {
                    const Icon = status.icon
                    const isSelected = filters.status === status.id
                    return (
                      <button
                        key={status.id}
                        onClick={() => updateFilter('status', isSelected ? undefined : status.id)}
                        className={`
                          flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                          ${isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : status.color}`} />
                        {status.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
