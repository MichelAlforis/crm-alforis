// components/shared/Card.tsx
// ============= MODERN CARD COMPONENT =============

import React, { forwardRef } from 'react'
import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  gradient?: boolean
  children: React.ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'lg',
      hoverable = false,
      gradient = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variants = {
      default: [
        'bg-foreground border border-border',
        'shadow-sm',
      ],
      glass: [
        'bg-white/80 dark:bg-gray-900/80',
        'backdrop-blur-xl border border-white/20',
        'shadow-xl',
      ],
      bordered: [
        'bg-transparent border-2 border-border',
      ],
      elevated: [
        'bg-foreground border border-border',
        'shadow-lg',
      ],
    }

    // Padding styles
    const paddings = {
      none: '',
      sm: 'p-spacing-sm',
      md: 'p-spacing-md',
      lg: 'p-spacing-lg',
      xl: 'p-spacing-xl',
    }

    return (
      <>
        {gradient && (
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-radius-lg">
            <div className="absolute -inset-[100%] animate-pulse-soft gradient-mesh opacity-30" />
          </div>
        )}
        
        <div
          ref={ref}
          className={clsx(
            // Base styles
            'relative rounded-radius-lg',
            'transition-all duration-base',
            
            // Variant
            variants[variant],
            
            // Padding
            paddings[padding],
            
            // Hoverable effect
            hoverable && [
              'cursor-pointer',
              'hover:shadow-lg hover:translate-y-[-2px]',
              'hover:border-text-muted',
              'active:translate-y-0',
            ],
            
            // Custom classes
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }
)

Card.displayName = 'Card'

// ============= CARD HEADER COMPONENT =============
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, icon, action, children, className, ...props }, ref) => {
    if (children) {
      return (
        <div
          ref={ref}
          className={clsx('pb-spacing-md', className)}
          {...props}
        >
          {children}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-start justify-between pb-spacing-md',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex-shrink-0 ml-spacing-md">
            {action}
          </div>
        )}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

// ============= CARD BODY COMPONENT =============
interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('py-spacing-md', className)}
      {...props}
    />
  )
)

CardBody.displayName = 'CardBody'

// ============= CARD FOOTER COMPONENT =============
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'pt-spacing-md border-t border-border',
        className
      )}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'