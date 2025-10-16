// components/shared/Select.tsx
// ============= SELECT COMPONENT - RÉUTILISABLE =============
import React from 'react';
import clsx from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          {...props}
          className={clsx(
            'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
            error ? 'border-rouge' : 'border-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-bleu'
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rouge mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select';
