
// components/shared/Card.tsx
// ============= CARD COMPONENT - RÉUTILISABLE =============
// Composant de base pour tous les containers

import React from 'react'
import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
  onClick?: () => void
}

export function Card({
  children,
  className,
  padding = 'md',
  hoverable = false,
  onClick,
}: CardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        paddingClasses[padding],
        hoverable && 'hover:shadow-md hover:border-gray-300 transition-all cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

