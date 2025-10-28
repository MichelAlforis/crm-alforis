// components/dashboard-v2/widgets/KPICardWidget.tsx
// ============= DASHBOARD V2 - KPI Card Widget =============

'use client'

import React from 'react'
import { Card } from '@/components/shared'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardWidgetProps {
  title: string
  value: number | string
  previousValue?: number
  changePercent?: number
  trend?: 'up' | 'down' | 'stable'
  format?: 'number' | 'currency' | 'percent'
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red'
  isLoading?: boolean
}

const colorMap = {
  blue: 'text-bleu',
  green: 'text-vert',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  red: 'text-red-500',
}

export function KPICardWidget({
  title,
  value,
  previousValue,
  changePercent,
  trend = 'stable',
  format = 'number',
  color = 'blue',
  isLoading = false,
}: KPICardWidgetProps) {

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val

    if (format === 'currency') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
      }).format(val)
    }

    if (format === 'percent') {
      return `${val.toFixed(1)}%`
    }

    return new Intl.NumberFormat('fr-FR').format(val)
  }

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600'
    if (trend === 'down') return 'text-red-600'
    return 'text-gray-500'
  }

  if (isLoading) {
    return (
      <Card padding="none" className="h-full animate-pulse">
        <div className="flex flex-col gap-fluid-2 p-fluid-4 @md:p-fluid-5">
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-10 w-1/2 rounded bg-gray-300" />
          <div className="h-3 w-1/3 rounded bg-gray-200" />
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none" className="h-full transition-shadow hover:shadow-lg">
      <div className="flex h-full flex-col gap-fluid-2 p-fluid-4 @md:p-fluid-5">
        <div className="flex items-start justify-between gap-fluid-2">
          <p className="text-fluid-sm font-medium text-gray-600">{title}</p>
          {getTrendIcon()}
        </div>

        <div className={`text-fluid-3xl font-bold leading-tight ${colorMap[color]}`}>
          {formatValue(value)}
        </div>

        {changePercent !== undefined && (
          <div className="flex items-center gap-fluid-2 text-fluid-sm">
            <span className={`font-medium ${getTrendColor()}`}>
              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </span>
            <span className="text-gray-500">vs période précédente</span>
          </div>
        )}

        {previousValue !== undefined && changePercent === undefined && (
          <div className="text-fluid-sm text-gray-500">
            Précédent: {formatValue(previousValue)}
          </div>
        )}
      </div>
    </Card>
  )
}
