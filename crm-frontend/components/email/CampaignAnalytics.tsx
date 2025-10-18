'use client'

import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import type { EmailCampaignStats } from '@/lib/types'

interface CampaignAnalyticsProps {
  stats?: EmailCampaignStats
  isLoading?: boolean
  lastUpdatedLabel?: string
  onRefresh?: () => void
  className?: string
}

const summaryCards = (stats: EmailCampaignStats) => [
  {
    label: 'Taux d\'ouverture',
    value: `${stats.open_rate.toFixed(1)}%`,
    helper: `${stats.opens.toLocaleString('fr-FR')} ouvertures / ${stats.total_sent.toLocaleString('fr-FR')} envois`,
  },
  {
    label: 'Taux de clic',
    value: `${stats.click_rate.toFixed(1)}%`,
    helper: `${stats.clicks.toLocaleString('fr-FR')} clics uniques`,
  },
  {
    label: 'Taux de rebond',
    value: `${stats.bounce_rate.toFixed(1)}%`,
    helper: `${stats.bounces.toLocaleString('fr-FR')} emails`,
  },
  {
    label: 'Unsubscribes',
    value: `${stats.unsubscribe_rate.toFixed(1)}%`,
    helper: `${stats.unsubscribes.toLocaleString('fr-FR')} désinscriptions`,
  },
]

export const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({
  stats,
  isLoading = false,
  lastUpdatedLabel,
  onRefresh,
  className,
}) => {
  const hasVariantData = (stats?.per_variant?.length ?? 0) > 0

  return (
    <Card className={className}>
      <CardHeader
        title="Performances campagne"
        subtitle="Suivez l'engagement (ouvertures, clics, désinscriptions) en temps réel"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
        }
      />
      <CardBody className="space-y-spacing-lg">
        {isLoading && (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-secondary">
            <span className="flex h-3 w-3 animate-ping rounded-full bg-primary" />
            Calcul des statistiques…
          </div>
        )}

        {!isLoading && !stats && (
          <Alert
            type="info"
            message="Aucune statistique disponible pour l'instant. Les métriques apparaîtront dès que la campagne aura été envoyée."
          />
        )}

        {!isLoading && stats && (
          <>
            <div className="grid gap-spacing-md md:grid-cols-4">
              {summaryCards(stats).map((card) => (
                <div
                  key={card.label}
                  className="rounded-radius-md border border-border bg-foreground p-spacing-md shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-text-primary">{card.value}</p>
                  <p className="mt-1 text-xs text-text-secondary">{card.helper}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-spacing-lg lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between pb-spacing-sm">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">Engagement global</h4>
                    <p className="text-xs text-text-secondary">
                      {stats.total_sent.toLocaleString('fr-FR')} emails envoyés · {stats.delivered.toLocaleString('fr-FR')} délivrés
                    </p>
                  </div>
                </div>
                <div className="h-72 rounded-radius-md border border-border bg-muted/40 p-spacing-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { label: 'Ouvertures', value: stats.opens, rate: stats.open_rate },
                        { label: 'Clics', value: stats.clicks, rate: stats.click_rate },
                        { label: 'Non-lus', value: Math.max(stats.total_sent - stats.opens, 0), rate: 100 - stats.open_rate },
                      ]}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number, _name, payload) => [
                          `${value.toLocaleString('fr-FR')} (${payload.payload.rate.toFixed(1)}%)`,
                          'Contacts',
                        ]}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-spacing-md">
                <div className="rounded-radius-md border border-border bg-foreground p-spacing-md">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <TrendingUp className="h-4 w-4 text-success" />
                    KPIs clés
                  </div>
                  <ul className="mt-spacing-sm space-y-2 text-sm text-text-secondary">
                    <li>
                      <span className="font-medium text-text-primary">Délivrés :</span>{' '}
                      {stats.delivered.toLocaleString('fr-FR')}
                    </li>
                    <li>
                      <span className="font-medium text-text-primary">Ouvertures uniques :</span>{' '}
                      {stats.unique_opens.toLocaleString('fr-FR')}
                    </li>
                    <li>
                      <span className="font-medium text-text-primary">Clics uniques :</span>{' '}
                      {stats.unique_clicks.toLocaleString('fr-FR')}
                    </li>
                    <li>
                      <span className="font-medium text-text-primary">Plaintes :</span>{' '}
                      {stats.complaints.toLocaleString('fr-FR')}
                    </li>
                  </ul>
                </div>

                {hasVariantData ? (
                  <div className="rounded-radius-md border border-border bg-foreground p-spacing-md">
                    <h4 className="text-sm font-semibold text-text-primary">A/B testing</h4>
                    <p className="text-xs text-text-secondary">
                      Comparaison des variantes sur l'ouverture et les clics
                    </p>
                    <div className="mt-spacing-sm space-y-2">
                      {stats.per_variant.map((variant) => (
                        <div key={variant.variant} className="rounded-radius-md border border-dashed border-border p-spacing-sm">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-text-primary">Variante {variant.variant}</span>
                            <span className="text-text-secondary">
                              {variant.total_sent.toLocaleString('fr-FR')} envois
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                            <span>Ouvertures: {variant.open_rate.toFixed(1)}%</span>
                            <span>Clics: {variant.click_rate.toFixed(1)}%</span>
                            <span>Bounces: {variant.bounces}</span>
                            <span>Désinscriptions: {variant.unsubscribes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert
                    type="info"
                    message="Ajoutez une variante A/B à votre campagne pour comparer automatiquement les performances."
                  />
                )}
              </div>
            </div>

            {lastUpdatedLabel && (
              <p className="text-xs text-text-tertiary">
                Dernière mise à jour : {lastUpdatedLabel}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

export default CampaignAnalytics
