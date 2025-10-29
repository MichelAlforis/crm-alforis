/**
 * StatsCard Component - Premium Stats Display
 *
 * Modern card for displaying statistics with animations
 */
'use client'

import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'
import { AnimatedCounter } from './AnimatedCounter'

interface StatsCardProps {
  title: string
  value: number
  format?: 'number' | 'currency' | 'percent'
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'gradient'
  className?: string
}

export function StatsCard({
  title,
  value,
  format = 'number',
  icon: Icon,
  trend,
  variant = 'default',
  className
}: StatsCardProps) {
  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-xl border transition-all duration-300',
        'hover-card hover-border-glow',
        variant === 'gradient'
          ? 'bg-gradient-to-br from-white via-white to-gray-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900'
          : 'bg-white dark:bg-slate-800',
        'border-gray-200 dark:border-slate-700',
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
              {title}
            </p>
            <div className="text-3xl font-bold text-gray-900 dark:text-slate-100">
              <AnimatedCounter value={value} format={format} decimals={format === 'currency' ? 0 : 1} />
            </div>
          </div>

          {Icon && (
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
            </div>
          )}
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span
              className={clsx(
                'text-sm font-medium',
                trend.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-sm text-gray-500 dark:text-slate-500">vs. mois dernier</span>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </div>
  )
}
