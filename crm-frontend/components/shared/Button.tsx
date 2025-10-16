// components/shared/Button.tsx
// ============= MODERN BUTTON COMPONENT =============

import React, { forwardRef } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variants = {
      primary: [
        'bg-primary text-white',
        'hover:bg-primary-hover hover:shadow-md',
        'active:scale-[0.98]',
      ],
      secondary: [
        'bg-foreground border border-border text-text-primary',
        'hover:bg-muted hover:border-text-muted',
        'active:scale-[0.98]',
      ],
      ghost: [
        'text-text-secondary',
        'hover:text-text-primary hover:bg-muted',
      ],
      danger: [
        'bg-danger text-white',
        'hover:bg-red-600 hover:shadow-md',
        'active:scale-[0.98]',
      ],
      success: [
        'bg-success text-white',
        'hover:bg-green-600 hover:shadow-md',
        'active:scale-[0.98]',
      ],
    }

    // Size styles
    const sizes = {
      xs: 'text-xs px-2.5 py-1.5 gap-1.5',
      sm: 'text-sm px-3 py-2 gap-2',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium rounded-radius-md',
          'transition-all duration-base',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Variant
          variants[variant],
          
          // Size
          sizes[size],
          
          // Width
          fullWidth && 'w-full',
          
          // Custom classes
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={size === 'xs' ? 14 : 16} />
            <span>Chargement...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'