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
      const token = localStorage.getItem('access_token')

      const response = await fetch(
        `${API_BASE}/api/v1/dashboard/email-performance?period=${period}`,
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
      <Card className="h-full">
        <CardHeader title={title} icon={<Mail className="h-5 w-5 text-bleu" />} />
        <CardBody>
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader title={title} icon={<Mail className="h-5 w-5 text-bleu" />} />
        <CardBody>
          <Alert type="error" message={error || 'Aucune donnée disponible'} />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader
        title={title}
        subtitle={getPeriodLabel()}
        icon={<Mail className="h-5 w-5 text-bleu" />}
      />
      <CardBody className="space-y-4">
        {/* Total sent */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-8 w-8 text-bleu" />
              <div>
                <p className="text-2xl font-bold text-bleu">{data.total_sent.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Emails envoyés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Delivery rate */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-700">{data.delivery_rate}%</p>
            <p className="text-xs text-gray-600">Délivrés</p>
            <p className="text-xs text-gray-500 mt-1">{data.delivered}</p>
          </div>

          {/* Open rate */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
            <Mail className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-700">{data.open_rate}%</p>
            <p className="text-xs text-gray-600">Ouverts</p>
            <p className="text-xs text-gray-500 mt-1">{data.opened}</p>
          </div>

          {/* Click rate */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
            <MousePointer className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-purple-700">{data.click_rate}%</p>
            <p className="text-xs text-gray-600">Cliqués</p>
            <p className="text-xs text-gray-500 mt-1">{data.clicked}</p>
          </div>
        </div>

        {/* Bounced */}
        {data.bounced > 0 && (
          <div className="p-3 bg-red-50 rounded border border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{data.bounced} emails rejetés</p>
                <p className="text-xs text-red-600">Vérifiez la qualité de vos listes</p>
              </div>
            </div>
          </div>
        )}

        {/* Benchmark indicators */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Benchmarks moyens:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Délivr:</span>{' '}
              <span className={data.delivery_rate >= 95 ? 'text-green-600 font-medium' : 'text-orange-600'}>
                95%+
              </span>
            </div>
            <div>
              <span className="text-gray-600">Ouv:</span>{' '}
              <span className={data.open_rate >= 20 ? 'text-green-600 font-medium' : 'text-orange-600'}>
                20%+
              </span>
            </div>
            <div>
              <span className="text-gray-600">Clic:</span>{' '}
              <span className={data.click_rate >= 3 ? 'text-green-600 font-medium' : 'text-orange-600'}>
                3%+
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
