'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, List, FileText, TrendingUp, Send, Users, Clock, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { logger } from '@/lib/logger'

interface Campaign {
  id: number
  name: string
  status: string
  sent_count?: number
  open_rate?: number
  click_rate?: number
}

interface CampaignsResponse {
  items: Campaign[]
  total: number
  page: number
  page_size: number
}

interface MailingListItem {
  id: number
  name: string
  recipient_count: number
  is_active: boolean
}

interface MailingListsResponse {
  items: MailingListItem[]
  total: number
  page: number
  page_size: number
}

interface MarketingStats {
  campaigns: {
    total: number
    draft: number
    scheduled: number
    sent: number
    sending: number
  }
  mailingLists: {
    total: number
    active: number
    totalRecipients: number
  }
  templates: {
    total: number
  }
  performance: {
    totalSent: number
    avgOpenRate: number
    avgClickRate: number
  }
}

export default function MarketingDashboard() {
  const router = useRouter()
  const { showToast } = useToast()
  const [stats, setStats] = useState<MarketingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)

      // Charger les données en parallèle
      const [campaignsRes, listsRes, templatesRes] = await Promise.all([
        apiClient.get<CampaignsResponse>('/email/campaigns'),
        apiClient.get<MailingListsResponse>('/mailing-lists'),
        apiClient.get('/email/templates'),
      ])

      const campaigns = campaignsRes.data?.items || []
      const lists = listsRes.data?.items || []
      const templates = templatesRes.data || []

      // Calculer les statistiques
      const campaignStats = {
        total: campaigns.length,
        draft: campaigns.filter((c: any) => c.status === 'draft').length,
        scheduled: campaigns.filter((c: any) => c.status === 'scheduled').length,
        sent: campaigns.filter((c: any) => c.status === 'sent').length,
        sending: campaigns.filter((c: any) => c.status === 'sending').length,
      }

      const listStats = {
        total: lists.length,
        active: lists.filter((l: any) => l.is_active).length,
        totalRecipients: lists.reduce((sum: number, l: any) => sum + (l.recipient_count || 0), 0),
      }

      const templateStats = {
        total: templates.length,
      }

      const sentCampaigns = campaigns.filter((c: any) => c.status === 'sent')
      const performance = {
        totalSent: sentCampaigns.reduce((sum: number, c: any) => sum + (c.sent_count || 0), 0),
        avgOpenRate: sentCampaigns.length > 0
          ? sentCampaigns.reduce((sum: number, c: any) => sum + (c.open_rate || 0), 0) / sentCampaigns.length
          : 0,
        avgClickRate: sentCampaigns.length > 0
          ? sentCampaigns.reduce((sum: number, c: any) => sum + (c.click_rate || 0), 0) / sentCampaigns.length
          : 0,
      }

      setStats({
        campaigns: campaignStats,
        mailingLists: listStats,
        templates: templateStats,
        performance,
      })
    } catch (error: any) {
      logger.error('Erreur chargement stats marketing:', error)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les statistiques',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Marketing Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérez vos campagnes, listes et templates email
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/marketing/campaigns/new')}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Mail className="mr-2 h-4 w-4" />
          Nouvelle Campagne
        </Button>
      </div>

      {/* KPIs Performance Globaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Envoyés</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                {stats.performance.totalSent.toLocaleString()}
              </p>
            </div>
            <Send className="h-10 w-10 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Taux d'Ouverture Moyen</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
                {stats.performance.avgOpenRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Taux de Clic Moyen</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                {stats.performance.avgClickRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Destinataires Totaux</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">
                {stats.mailingLists.totalRecipients.toLocaleString()}
              </p>
            </div>
            <Users className="h-10 w-10 text-orange-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Alertes Actives */}
      {stats.campaigns.sending > 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <p className="text-blue-900 dark:text-blue-100 font-medium">
              {stats.campaigns.sending} campagne{stats.campaigns.sending > 1 ? 's' : ''} en cours d'envoi
            </p>
          </div>
        </Card>
      )}

      {/* Modules Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Campagnes */}
        <Card
          className="p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800"
          onClick={() => router.push('/dashboard/marketing/campaigns')}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Campagnes Email</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.campaigns.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Brouillons</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.campaigns.draft}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Programmées</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">{stats.campaigns.scheduled}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Envoyées</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.campaigns.sent}</span>
            </div>
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation()
              router.push('/dashboard/marketing/campaigns/new')
            }}
            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            Nouvelle Campagne
          </Button>
        </Card>

        {/* Listes de Diffusion */}
        <Card
          className="p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border-purple-200 dark:border-purple-800"
          onClick={() => router.push('/dashboard/marketing/mailing-lists')}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
              <List className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Listes de Diffusion</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.mailingLists.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Actives</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.mailingLists.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Destinataires</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {stats.mailingLists.totalRecipients.toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation()
              router.push('/dashboard/marketing/mailing-lists')
            }}
            className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
          >
            Gérer les Listes
          </Button>
        </Card>

        {/* Templates */}
        <Card
          className="p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10 border-pink-200 dark:border-pink-800"
          onClick={() => router.push('/dashboard/marketing/templates')}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Templates Email</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.templates.total}</span>
            </div>
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Templates réutilisables pour vos campagnes
            </div>
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation()
              router.push('/dashboard/marketing/templates')
            }}
            className="w-full mt-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            Gérer les Templates
          </Button>
        </Card>
      </div>
    </div>
  )
}
