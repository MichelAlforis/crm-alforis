/**
 * Carte de statistique pour le Dashboard AI
 */
'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface AIStatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  gradient: string
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  onClick?: () => void
}

export default function AIStatCard({
  title,
  value,
  icon: Icon,
  gradient,
  subtitle,
  trend,
  onClick,
}: AIStatCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-xl hover:scale-105'
      )}
      onClick={onClick}
    >
      {/* Background gradient effect */}
      <div className={clsx('absolute inset-0 opacity-5 bg-gradient-to-br', gradient)} />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          </div>

          <div className={clsx('rounded-xl p-3 bg-gradient-to-br shadow-lg', gradient)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Trend indicator */}
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <span
              className={clsx(
                'text-sm font-semibold',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-gray-500">vs. période précédente</span>
          </div>
        )}
      </div>
    </div>
  )
}
