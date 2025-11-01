'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  width?: 'narrow' | 'default' | 'wide' | 'full'
  spacing?: 'tight' | 'normal' | 'loose'
  className?: string
}

/**
 * PageContainer - Wrapper de page standardisé
 *
 * Unifie les max-width et spacing selon les règles du design system
 * Utilise les design tokens de tailwind.config.js
 *
 * @example
 * <PageContainer width="default" spacing="normal">
 *   <PageTitle>Mon Titre</PageTitle>
 *   <PageSection>Contenu...</PageSection>
 * </PageContainer>
 */
export function PageContainer({
  children,
  width = 'default',
  spacing = 'normal',
  className,
}: PageContainerProps) {
  // Max-width standardisés (basé sur audit du code)
  const widthClasses = {
    narrow: 'max-w-4xl',          // Articles, forms (896px)
    default: 'max-w-7xl',         // Pages standards (1280px)
    wide: 'max-w-screen-2xl',     // Dashboards, tables (1536px)
    full: 'w-full',               // No constraint
  }

  // Spacing vertical standardisé (utilise design tokens)
  const spacingClasses = {
    tight: 'space-y-spacing-md',      // 16px
    normal: 'space-y-spacing-lg',     // 24px
    loose: 'space-y-spacing-2xl',     // 40px
  }

  return (
    <div
      className={cn(
        // Width
        widthClasses[width],
        'mx-auto',

        // Padding horizontal responsive (design tokens)
        'px-spacing-lg',        // 24px mobile
        'lg:px-spacing-2xl',    // 40px desktop

        // Padding vertical responsive
        'py-spacing-xl',        // 32px mobile
        'lg:py-spacing-3xl',    // 48px desktop

        // Vertical spacing entre enfants
        spacingClasses[spacing],

        // Custom classes
        className
      )}
    >
      {children}
    </div>
  )
}

// ============= SUB-COMPONENTS =============

/**
 * PageHeader - En-tête de page standardisé
 * Utilise design tokens pour spacing vertical
 */
interface PageHeaderProps {
  children: React.ReactNode
  className?: string
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <header className={cn('space-y-spacing-sm', className)}>
      {children}
    </header>
  )
}

/**
 * PageSection - Section de contenu standardisée
 * Utilise design tokens pour spacing vertical
 */
interface PageSectionProps {
  children: React.ReactNode
  className?: string
}

export function PageSection({ children, className }: PageSectionProps) {
  return (
    <section className={cn('space-y-spacing-md', className)}>
      {children}
    </section>
  )
}

/**
 * PageTitle - Titre de page H1 standardisé
 * Utilise fluid typography pour responsive
 */
interface PageTitleProps {
  children: React.ReactNode
  subtitle?: string
  className?: string
}

export function PageTitle({ children, subtitle, className }: PageTitleProps) {
  return (
    <div className={cn('space-y-spacing-xs', className)}>
      <h1 className="text-fluid-3xl font-bold text-text-primary">
        {children}
      </h1>
      {subtitle && (
        <p className="text-fluid-base text-text-secondary">
          {subtitle}
        </p>
      )}
    </div>
  )
}
