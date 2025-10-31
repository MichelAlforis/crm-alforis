// components/dashboard-v2/widgets/TopClientsWidget.tsx
// ============= DASHBOARD V2 - Top Clients Widget =============

'use client'

import React, { useState, useEffect } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Alert } from '@/components/shared/Alert'
import { Star, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { TopClient } from '@/lib/types/dashboard'

interface TopClientsWidgetProps {
  title?: string
  limit?: number
  sortBy?: 'revenue' | 'deals' | 'health_score'
}

export function TopClientsWidget({
  title = 'Top Clients',
  limit = 10,
  sortBy = 'revenue',
}: TopClientsWidgetProps) {
  const [clients, setClients] = useState<TopClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetchTopClients()
  }, [limit, sortBy])

  const fetchTopClients = async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

      const response = await fetch(
        `${API_BASE}/dashboard/top-clients?limit=${limit}&sort_by=${sortBy}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch top clients')

      const result = await response.json()
      setClients(result)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des clients')
    } finally {
      setIsLoading(false)
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Jamais'
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`
    return `Il y a ${Math.floor(diffDays / 30)}mois`
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader title={title} icon={<Star className="h-5 w-5 text-yellow-500" />} />
        <CardBody>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 border border-gray-200 rounded">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
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
        <CardHeader title={title} icon={<Star className="h-5 w-5 text-yellow-500" />} />
        <CardBody>
          <Alert type="error" message={error} />
        </CardBody>
      </Card>
    )
  }

  if (clients.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title={title} icon={<Star className="h-5 w-5 text-yellow-500" />} />
        <CardBody>
          <div className="py-8 text-center text-gray-500 text-sm">
            Aucun client trouvé
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader
        title={title}
        subtitle={`Classement par ${sortBy === 'revenue' ? 'revenu' : sortBy === 'deals' ? 'deals' : 'score de santé'}`}
        icon={<Star className="h-5 w-5 text-yellow-500" />}
      />
      <CardBody className="space-y-2 max-h-96 overflow-y-auto">
        {clients.map((client, index) => (
          <Link
            key={client.organisation_id}
            href={`/dashboard/organisations/${client.organisation_id}`}
            className="block p-3 rounded-lg border border-gray-200 hover:border-bleu hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-bleu to-purple-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-ardoise truncate">
                    {client.name}
                  </h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getHealthScoreColor(client.health_score)}`}>
                    {client.health_score}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  {client.revenue > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{client.revenue.toLocaleString('fr-FR')}€</span>
                    </div>
                  )}

                  {client.deals_count > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{client.deals_count}</span>
                      <span>deals</span>
                    </div>
                  )}

                  {client.last_interaction && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(client.last_interaction.toString())}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}
