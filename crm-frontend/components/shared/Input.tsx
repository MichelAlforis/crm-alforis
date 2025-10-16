// components/shared/Input.tsx
// ============= INPUT COMPONENT - RÉUTILISABLE =============
import React from 'react';
import clsx from 'clsx';


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={clsx(
            'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
            error ? 'border-rouge focus:ring-rouge' : 'border-gray-300 focus:ring-bleu',
            'focus:outline-none focus:ring-2'
          )}
        />
        {error && <p className="text-xs text-rouge mt-1">{error}</p>}
        {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input';