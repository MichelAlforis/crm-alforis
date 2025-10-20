'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Eye, MousePointerClick, Ban } from 'lucide-react'
import { Card, Alert } from '@/components/shared'
import { useEmailCampaign, useEmailCampaignStats } from '@/hooks/useEmailAutomation'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-orange-100 text-orange-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0

  const { data: campaign, isLoading, error } = useEmailCampaign(campaignId)
  const { data: stats } = useEmailCampaignStats(campaignId)

  if (isLoading) return <div className="p-6">Chargement...</div>
  if (error || !campaign) return <Alert type="error" message="Campagne introuvable" />

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/campaigns" className="inline-flex items-center text-sm text-bleu hover:underline mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux campagnes
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-ardoise">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[campaign.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700'}`}>
              {campaign.status}
            </span>
            {campaign.scheduled_at && (
              <span className="text-sm text-gray-600">
                Programmée pour: {new Date(campaign.scheduled_at).toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-bleu">{stats?.total_sent || 0}</div>
          <p className="text-gray-600 text-sm mt-1">Envoyés</p>
        </Card>

        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
            <Eye className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats?.opens || 0}
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Ouvertures ({stats?.open_rate ? (stats.open_rate * 100).toFixed(1) : '0'}%)
          </p>
        </Card>

        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-2">
            <MousePointerClick className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {stats?.clicks || 0}
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Clics ({stats?.click_rate ? (stats.click_rate * 100).toFixed(1) : '0'}%)
          </p>
        </Card>

        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-2">
            <Ban className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">
            {stats?.bounces || 0}
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Rebonds ({stats?.bounce_rate ? (stats.bounce_rate * 100).toFixed(1) : '0'}%)
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Détails de la campagne</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Nom</p>
            <p className="font-medium">{campaign.name}</p>
          </div>

          {campaign.subject && (
            <div>
              <p className="text-sm text-gray-600">Objet</p>
              <p className="font-medium">{campaign.subject}</p>
            </div>
          )}

          {campaign.default_template_id && (
            <div>
              <p className="text-sm text-gray-600">Template</p>
              <p className="font-medium">Template #{campaign.default_template_id}</p>
            </div>
          )}

          {campaign.provider && (
            <div>
              <p className="text-sm text-gray-600">Fournisseur</p>
              <p className="font-medium">{campaign.provider}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Créée le</p>
            <p className="font-medium">{new Date(campaign.created_at).toLocaleString('fr-FR')}</p>
          </div>

          {campaign.last_sent_at && (
            <div>
              <p className="text-sm text-gray-600">Dernier envoi le</p>
              <p className="font-medium">{new Date(campaign.last_sent_at).toLocaleString('fr-FR')}</p>
            </div>
          )}
        </div>
      </Card>

      {stats && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Statistiques détaillées</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total envoyés</p>
              <p className="text-2xl font-bold text-bleu">{stats.total_sent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total ouvertures</p>
              <p className="text-2xl font-bold text-green-600">{stats.opens}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ouvertures uniques</p>
              <p className="text-2xl font-bold text-green-600">{stats.unique_opens}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total clics</p>
              <p className="text-2xl font-bold text-purple-600">{stats.clicks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Clics uniques</p>
              <p className="text-2xl font-bold text-purple-600">{stats.unique_clicks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total rebonds</p>
              <p className="text-2xl font-bold text-red-600">{stats.bounces}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total désinscriptions</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unsubscribes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plaintes spam</p>
              <p className="text-2xl font-bold text-gray-600">{stats.complaints}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
