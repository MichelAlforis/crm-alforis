// components/marketing/CampaignStatsCards.tsx
// KPI cards for campaign statistics

import React from 'react'
import { Mail, Clock, Calendar, CheckCircle, XCircle, Send } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/shared'
import type { CampaignStats } from '@/hooks/useCampaignStats'

interface CampaignStatsCardsProps {
  stats: CampaignStats
  onFilterChange: (status: string | null) => void
}

export function CampaignStatsCards({ stats, onFilterChange }: CampaignStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-spacing-md">
      {/* Total */}
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onFilterChange(null)}>
        <CardBody className="p-spacing-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-tertiary">Total</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{stats.total}</p>
              <p className="text-xs text-text-secondary mt-1">Toutes les campagnes</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Brouillons */}
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onFilterChange('draft')}>
        <CardBody className="p-spacing-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-tertiary">Brouillons</p>
              <p className="text-3xl font-bold text-gray-700 dark:text-slate-300 mt-1">{stats.draft}</p>
              <p className="text-xs text-text-secondary mt-1">À terminer</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-600 dark:text-slate-400" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Programmées */}
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onFilterChange('scheduled')}>
        <CardBody className="p-spacing-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-tertiary">Programmées</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{stats.scheduled}</p>
              <p className="text-xs text-text-secondary mt-1">En attente d'envoi</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Envoyées */}
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onFilterChange('sent')}>
        <CardBody className="p-spacing-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-tertiary">Envoyées</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{stats.sent}</p>
              <p className="text-xs text-text-secondary mt-1">Campagnes terminées</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// Alert components for active and failed campaigns
interface CampaignAlertsProps {
  stats: CampaignStats
}

export function CampaignAlerts({ stats }: CampaignAlertsProps) {
  return (
    <>
      {/* Campagnes actives (en cours d'envoi) */}
      {stats.sending > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader
            title={`${stats.sending} campagne(s) en cours d'envoi`}
            subtitle="Envoi en temps réel"
            icon={<Send className="w-5 h-5 text-orange-600" />}
          />
          <CardBody>
            <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
              <span>Les emails sont en cours d'envoi...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Campagnes échouées */}
      {stats.failed > 0 && (
        <Card className="border-error/20 bg-error/5 dark:border-error/40">
          <CardHeader
            title={`${stats.failed} campagne(s) échouée(s)`}
            subtitle="Attention requise"
            icon={<XCircle className="w-5 h-5 text-error" />}
          />
          <CardBody>
            <div className="flex items-center gap-2 text-sm text-error">
              <span>Veuillez vérifier les campagnes échouées et les relancer si nécessaire</span>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  )
}
