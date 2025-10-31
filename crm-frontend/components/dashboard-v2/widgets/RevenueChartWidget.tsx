// components/dashboard-v2/widgets/RevenueChartWidget.tsx
// ============= DASHBOARD V2 - Revenue Chart Widget =============

'use client'

import React, { useState, useEffect } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Alert } from '@/components/shared/Alert'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RevenueData } from '@/lib/types/dashboard'

interface RevenueChartWidgetProps {
  title?: string
  period?: '7days' | '30days' | '90days' | '12months'
  chartType?: 'line' | 'bar' | 'area'
  comparison?: 'none' | 'previous_period' | 'same_period_last_year'
}

export function RevenueChartWidget({
  title = 'Évolution du revenu',
  period = '30days',
  chartType = 'area',
  comparison = 'none',
}: RevenueChartWidgetProps) {
  const [data, setData] = useState<RevenueData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetchRevenueData()
  }, [period])

  const fetchRevenueData = async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

      const response = await fetch(
        `${API_BASE}/dashboard/revenue?period=${period}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch revenue data')

      const result = await response.json()
      setData(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des données'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatPeriod = (period: string) => {
    // Truncate long dates for better display
    if (period.length > 10) {
      return period.substring(0, 10)
    }
    return period
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    const xAxisProps = {
      dataKey: 'period',
      tickFormatter: formatPeriod,
      tick: { fontSize: 12 },
    }

    const yAxisProps = {
      tickFormatter: (value: number) => `${(value / 1000).toFixed(0)}k€`,
      tick: { fontSize: 12 },
    }

    const tooltipFormatter = (value: number) => [formatCurrency(value), 'Revenu']

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenu"
          />
          {comparison !== 'none' && (
            <Line
              type="monotone"
              dataKey="target"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Objectif"
            />
          )}
        </LineChart>
      )
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" name="Revenu" radius={[8, 8, 0, 0]} />
          {comparison !== 'none' && (
            <Bar dataKey="target" fill="#9ca3af" name="Objectif" radius={[8, 8, 0, 0]} />
          )}
        </BarChart>
      )
    }

    // Default: area chart
    return (
      <AreaChart {...commonProps}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          name="Revenu"
        />
      </AreaChart>
    )
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader title={title} />
        <CardBody>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bleu"></div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader title={title} />
        <CardBody>
          <Alert type="error" message={error} />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader
        title={title}
        subtitle={`Période: ${period === '7days' ? '7 derniers jours' : period === '30days' ? '30 derniers jours' : period === '90days' ? '90 derniers jours' : '12 derniers mois'}`}
      />
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
