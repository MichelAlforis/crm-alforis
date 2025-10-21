'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export interface MobileCardField {
  label: string
  value: React.ReactNode
  primary?: boolean
  secondary?: boolean
}

interface MobileCardProps {
  fields: MobileCardField[]
  onClick?: () => void
  actions?: React.ReactNode
  className?: string
}

/**
 * Composant carte optimisé pour mobile
 * Remplace les lignes de tableau sur petits écrans
 */
export default function MobileCard({
  fields,
  onClick,
  actions,
  className,
}: MobileCardProps) {
  const primaryField = fields.find((f) => f.primary)
  const secondaryField = fields.find((f) => f.secondary)
  const otherFields = fields.filter((f) => !f.primary && !f.secondary)

  return (
    <div
      className={clsx(
        'bg-background border border-border rounded-radius-lg p-4 shadow-shadow-sm',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-shadow-md hover:border-primary/30 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      {/* Header: Primary + Secondary */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {primaryField && (
            <div className="font-semibold text-text-primary text-base truncate mb-1">
              {primaryField.value}
            </div>
          )}
          {secondaryField && (
            <div className="text-sm text-text-secondary truncate">
              {secondaryField.value}
            </div>
          )}
        </div>

        {onClick && (
          <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0 mt-1" />
        )}
      </div>

      {/* Fields Grid */}
      {otherFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {otherFields.map((field, index) => (
            <div key={index} className="min-w-0">
              <div className="text-xs text-text-muted mb-0.5">{field.label}</div>
              <div className="text-sm text-text-primary font-medium truncate">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {actions}
        </div>
      )}
    </div>
  )
}
