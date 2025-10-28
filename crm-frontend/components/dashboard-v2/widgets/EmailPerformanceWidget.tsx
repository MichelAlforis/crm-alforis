// components/dashboard-v2/widgets/EmailPerformanceWidget.tsx
// ============= DASHBOARD V2 - Email Performance Widget =============

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Alert } from '@/components/shared/Alert'
import { Mail, CheckCircle, MousePointer, XCircle, Send } from 'lucide-react'

interface EmailPerformanceData {
  total_sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  delivery_rate: number
  open_rate: number
  click_rate: number
}

interface EmailPerformanceWidgetProps {
  title?: string
  period?: '7days' | '30days' | '90days'
}

export function EmailPerformanceWidget({
  title = 'Performance Emails',
  period = '30days',
}: EmailPerformanceWidgetProps) {
  const [data, setData] = useState<EmailPerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetchEmailPerformance()
  }, [period])

  const fetchEmailPerformance = async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(
        `${API_BASE}/dashboard/email-performance?period=${period}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch email performance')

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  const getPeriodLabel = () => {
    if (period === '7days') return '7 derniers jours'
    if (period === '30days') return '30 derniers jours'
    return '90 derniers jours'
  }

  if (isLoading) {
    return (
      <Card padding="none" className="h-full">
        <CardHeader title={title} icon={<Mail className="h-5 w-5 text-bleu" />} />
        <CardBody className="@container">
          <div className="flex animate-pulse flex-col gap-fluid-3">
            <div className="h-20 rounded bg-gray-200" />
            <div className="grid grid-cols-1 gap-fluid-2 @md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded bg-gray-200" />
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card padding="none" className="h-full">
        <CardHeader title={title} icon={<Mail className="h-5 w-5 text-bleu" />} />
        <CardBody>
          <Alert type="error" message={error || 'Aucune donnée disponible'} />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card padding="none" className="h-full">
      <CardHeader
        title={title}
        subtitle={getPeriodLabel()}
        icon={<Mail className="h-5 w-5 text-bleu" />}
      />
      <CardBody className="@container flex flex-col gap-fluid-3">
        {/* Total sent */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-fluid-4">
          <div className="flex items-center gap-fluid-3">
            <Send className="h-8 w-8 text-bleu" />
            <div>
              <p className="text-fluid-2xl font-bold text-bleu">
                {data.total_sent.toLocaleString()}
              </p>
              <p className="text-fluid-sm text-gray-600">Emails envoyés</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-fluid-2 @md:grid-cols-3">
          {/* Delivery rate */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-fluid-3 text-center">
            <CheckCircle className="mx-auto mb-1 h-6 w-6 text-green-600" />
            <p className="text-fluid-xl font-bold text-green-700">{data.delivery_rate}%</p>
            <p className="text-fluid-xs text-gray-600">Délivrés</p>
            <p className="mt-1 text-fluid-xs text-gray-500">{data.delivered}</p>
          </div>

          {/* Open rate */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-fluid-3 text-center">
            <Mail className="mx-auto mb-1 h-6 w-6 text-blue-600" />
            <p className="text-fluid-xl font-bold text-blue-700">{data.open_rate}%</p>
            <p className="text-fluid-xs text-gray-600">Ouverts</p>
            <p className="mt-1 text-fluid-xs text-gray-500">{data.opened}</p>
          </div>

          {/* Click rate */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-fluid-3 text-center">
            <MousePointer className="mx-auto mb-1 h-6 w-6 text-purple-600" />
            <p className="text-fluid-xl font-bold text-purple-700">{data.click_rate}%</p>
            <p className="text-fluid-xs text-gray-600">Cliqués</p>
            <p className="mt-1 text-fluid-xs text-gray-500">{data.clicked}</p>
          </div>
        </div>

        {/* Bounced */}
        {data.bounced > 0 && (
          <div className="rounded border border-red-200 bg-red-50 p-fluid-3">
            <div className="flex items-center gap-fluid-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <div className="flex-1">
                <p className="text-fluid-sm font-medium">{data.bounced} emails rejetés</p>
                <p className="text-fluid-xs text-red-600">Vérifiez la qualité de vos listes</p>
              </div>
            </div>
          </div>
        )}

        {/* Benchmark indicators */}
        <div className="border-t border-gray-200 pt-fluid-2">
          <p className="mb-fluid-2 text-fluid-xs text-gray-500">Benchmarks moyens:</p>
          <div className="grid grid-cols-1 gap-fluid-1 text-fluid-xs @sm:grid-cols-3">
            <div>
              <span className="text-gray-600">Délivr:</span>{' '}
              <span className={data.delivery_rate >= 95 ? 'font-medium text-green-600' : 'text-orange-600'}>
                95%+
              </span>
            </div>
            <div>
              <span className="text-gray-600">Ouv:</span>{' '}
              <span className={data.open_rate >= 20 ? 'font-medium text-green-600' : 'text-orange-600'}>
                20%+
              </span>
            </div>
            <div>
              <span className="text-gray-600">Clic:</span>{' '}
              <span className={data.click_rate >= 3 ? 'font-medium text-green-600' : 'text-orange-600'}>
                3%+
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
