// components/shared/Input.tsx
// ============= INPUT COMPONENT - RÉUTILISABLE =============
import React from 'react';
import clsx from 'clsx';


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            className={clsx(
              'w-full py-2 border rounded-lg text-sm transition-colors',
              leftIcon ? 'pl-10 pr-3' : 'px-3',
              error ? 'border-rouge focus:ring-rouge' : 'border-gray-300 focus:ring-bleu',
              'focus:outline-none focus:ring-2'
            )}
          />
        </div>
        {error && <p className="text-xs text-rouge mt-1">{error}</p>}
        {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input';