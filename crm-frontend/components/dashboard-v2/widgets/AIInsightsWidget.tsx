// components/dashboard-v2/widgets/AIInsightsWidget.tsx
// ============= DASHBOARD V2 - AI Insights Widget =============

'use client'

import React, { useState, useEffect } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Alert } from '@/components/shared/Alert'
import { Button } from '@/components/shared/Button'
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Target,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import type { AIInsight } from '@/lib/types/dashboard'

interface AIInsightsWidgetProps {
  title?: string
  limit?: number
}

const INSIGHT_TYPE_CONFIG = {
  opportunity: {
    icon: Target,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    label: 'Opportunité',
  },
  risk: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    label: 'Alerte',
  },
  recommendation: {
    icon: Lightbulb,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    label: 'Recommandation',
  },
  trend: {
    icon: TrendingUp,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    label: 'Tendance',
  },
}

const IMPACT_CONFIG = {
  low: { label: 'Faible', color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300' },
  medium: { label: 'Moyen', color: 'bg-orange-100 text-orange-700' },
  high: { label: 'Élevé', color: 'bg-red-100 text-red-700' },
}

export function AIInsightsWidget({
  title = 'Insights IA',
  limit = 5,
}: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetchInsights()
  }, [limit])

  const fetchInsights = async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

      const response = await fetch(
        `${API_BASE}/dashboard/ai-insights?limit=${limit}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch insights')

      const result = await response.json()
      setInsights(result)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des insights')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader
          title={title}
          subtitle="Recommandations intelligentes basées sur vos données"
          icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        />
        <CardBody>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader
          title={title}
          icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        />
        <CardBody>
          <Alert type="error" message={error} />
        </CardBody>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader
          title={title}
          subtitle="Recommandations intelligentes basées sur vos données"
          icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        />
        <CardBody>
          <div className="py-8 text-center text-gray-500">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Aucun insight disponible pour le moment.</p>
            <p className="text-xs mt-1">L'IA analyse vos données en continu...</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader
        title={title}
        subtitle="Recommandations intelligentes basées sur vos données"
        icon={<Sparkles className="h-5 w-5 text-purple-500" />}
      />
      <CardBody className="space-y-3 max-h-96 overflow-y-auto">
        {insights.map((insight, index) => {
          const typeConfig = INSIGHT_TYPE_CONFIG[insight.type as keyof typeof INSIGHT_TYPE_CONFIG]
          const impactConfig = IMPACT_CONFIG[insight.impact as keyof typeof IMPACT_CONFIG]
          const Icon = typeConfig.icon

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${typeConfig.borderColor} ${typeConfig.bgColor} hover:shadow-md transition-shadow`}
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 h-10 w-10 rounded-full ${typeConfig.bgColor} flex items-center justify-center border ${typeConfig.borderColor}`}>
                  <Icon className={`h-5 w-5 ${typeConfig.iconColor}`} />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${impactConfig.color}`}>
                          Impact {impactConfig.label}
                        </span>
                        <span className={`text-xs font-medium ${typeConfig.textColor}`}>
                          {typeConfig.label}
                        </span>
                      </div>
                      <h4 className={`font-semibold text-sm ${typeConfig.textColor}`}>
                        {insight.title}
                      </h4>
                    </div>

                    <div className="text-xs text-gray-500">
                      {(insight.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    {insight.description}
                  </p>

                  {insight.action_url && (
                    <Link href={insight.action_url}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`mt-2 ${typeConfig.textColor} hover:${typeConfig.bgColor}`}
                      >
                        Voir plus
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}
