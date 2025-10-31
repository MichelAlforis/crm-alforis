// components/shared/AdvancedFilters.tsx
// ============= ADVANCED FILTERS PANEL =============
// Permet d'afficher des filtres configurables avec un panneau repliable

'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Filter } from 'lucide-react'
import { Button } from './Button'

type FilterType = 'select' | 'multi-select' | 'date' | 'search'

export interface AdvancedFilterDefinition {
  key: string
  label: string
  type: FilterType
  options?: { value: string; label: string }[]
  placeholder?: string
  helperText?: string
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterDefinition[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onReset?: () => void
  className?: string
  title?: string
}

const baseInputClasses =
  'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'

export function AdvancedFilters({
  filters,
  values,
  onChange,
  onReset,
  className,
  title = 'Filtres avancés',
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const activeCount = useMemo(() => {
    return filters.reduce((count, filter) => {
      const currentValue = values[filter.key]
      if (Array.isArray(currentValue)) {
        return count + (currentValue.length > 0 ? 1 : 0)
      }
      return count + (currentValue ? 1 : 0)
    }, 0)
  }, [filters, values])

  const handleSelectChange = (key: string, value: string) => {
    onChange(key, value)
  }

  const handleMultiToggle = (
    key: string,
    optionValue: string,
    checked: boolean
  ) => {
    const currentValue = Array.isArray(values[key]) ? (values[key] as string[]) : []
    const nextValue = checked
      ? [...currentValue, optionValue]
      : currentValue.filter((item) => item !== optionValue)
    onChange(key, nextValue)
  }

  const renderFilter = (filter: AdvancedFilterDefinition) => {
    const currentValue = values[filter.key]

    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              {filter.label}
            </label>
            <select
              value={(currentValue as string) ?? ''}
              onChange={(event) => handleSelectChange(filter.key, event.target.value)}
              className={baseInputClasses}
            >
              {(filter.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {filter.helperText && (
              <p className="text-xs text-gray-500">{filter.helperText}</p>
            )}
          </div>
        )
      case 'multi-select': {
        const selected = Array.isArray(currentValue) ? (currentValue as string[]) : []
        return (
          <div key={filter.key} className="space-y-2">
            <p className="text-xs font-semibold uppercase text-gray-500">
              {filter.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {(filter.options ?? []).map((option) => {
                const isChecked = selected.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={clsx(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition',
                      isChecked
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={isChecked}
                      onChange={(event) =>
                        handleMultiToggle(filter.key, option.value, event.target.checked)
                      }
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
            {filter.helperText && (
              <p className="text-xs text-gray-500">{filter.helperText}</p>
            )}
          </div>
        )
      }
      case 'date':
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              {filter.label}
            </label>
            <input
              type="date"
              value={(currentValue as string) ?? ''}
              onChange={(event) => onChange(filter.key, event.target.value)}
              className={baseInputClasses}
            />
            {filter.helperText && (
              <p className="text-xs text-gray-500">{filter.helperText}</p>
            )}
          </div>
        )
      case 'search':
      default:
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              {filter.label}
            </label>
            <input
              type="text"
              value={(currentValue as string) ?? ''}
              placeholder={filter.placeholder}
              onChange={(event) => onChange(filter.key, event.target.value)}
              className={baseInputClasses}
            />
            {filter.helperText && (
              <p className="text-xs text-gray-500">{filter.helperText}</p>
            )}
          </div>
        )
    }
  }

  return (
    <div
      className={clsx(
        'border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {activeCount}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? 'Masquer' : 'Afficher'}
        </Button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filters.map((filter) => renderFilter(filter))}
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            {onReset && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onReset()}
              >
                Réinitialiser
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

