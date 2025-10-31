'use client'

import { Card } from '@/components/shared'

interface MetricCardProps {
  title: string
  value: string | number
  percent?: number
  status?: 'healthy' | 'warning' | 'critical'
  subtitle?: string
  showProgress?: boolean
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800'
    case 'critical':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getProgressColor = (percent?: number) => {
  if (!percent) return 'bg-gray-400'
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function MetricCard({ title, value, percent, status, subtitle, showProgress = true }: MetricCardProps) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{title}</h3>
          {status && (
            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(status)}`}>
              {status}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
        {showProgress && percent !== undefined && (
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percent)}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        )}
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </div>
    </Card>
  )
}
