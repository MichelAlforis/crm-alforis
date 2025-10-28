'use client'

import React from 'react'
import Link from 'next/link'
import { User, Phone, FileText, Eye, MousePointerClick, Mail } from 'lucide-react'
import { Card, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'

interface RecipientWithTracking {
  id: number
  recipient: {
    person_id: number | null
    name: string
    email: string
    organisation: string | null
    role: string | null
  }
  tracking: {
    sent_at: string | null
    opened: Array<{ event_at: string; ip: string | null }>
    clicked: Array<{ event_at: string; url: string | null; ip: string | null }>
    bounced: boolean
    open_count: number
    click_count: number
  }
  engagement_score: number
}

interface RecipientTrackingListProps {
  recipients: RecipientWithTracking[]
  isLoading?: boolean
  onCallClick?: (personId: number, recipient: RecipientWithTracking) => void
  onNoteClick?: (personId: number, recipient: RecipientWithTracking) => void
}

export function RecipientTrackingList({
  recipients,
  isLoading = false,
  onCallClick,
  onNoteClick,
}: RecipientTrackingListProps) {
  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'il y a moins d\'1h'
    if (diffHours < 24) return `il y a ${diffHours}h`
    if (diffDays === 1) return 'hier'
    if (diffDays < 7) return `il y a ${diffDays}j`
    return formatDate(isoString)
  }

  const getEngagementBadge = (score: number) => {
    if (score >= 70) {
      return {
        label: '🔥 Lead très chaud',
        className: 'bg-red-100 text-red-700 border-red-200',
      }
    }
    if (score >= 40) {
      return {
        label: '⚡ Lead chaud',
        className: 'bg-orange-100 text-orange-700 border-orange-200',
      }
    }
    if (score >= 20) {
      return {
        label: '🟢 Intéressé',
        className: 'bg-green-100 text-green-700 border-green-200',
      }
    }
    return {
      label: '⚪ Envoyé',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardBody className="p-4">
              <div className="h-20 bg-muted/20 rounded" />
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  if (recipients.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary">Aucun destinataire trouvé avec ces critères</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {recipients.map((recipient) => {
        const badge = getEngagementBadge(recipient.engagement_score)
        const lastClick = recipient.tracking.clicked.length > 0
          ? recipient.tracking.clicked[recipient.tracking.clicked.length - 1]
          : null
        const lastOpen = recipient.tracking.opened.length > 0
          ? recipient.tracking.opened[recipient.tracking.opened.length - 1]
          : null

        return (
          <Card
            key={recipient.id}
            className="hover:shadow-lg transition-shadow border-l-4"
            style={{
              borderLeftColor: recipient.engagement_score >= 70 ? '#ef4444' :
                               recipient.engagement_score >= 40 ? '#f97316' :
                               recipient.engagement_score >= 20 ? '#22c55e' : '#9ca3af'
            }}
          >
            <CardBody className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Infos personne */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-text-primary truncate">
                          {recipient.recipient.name}
                        </h3>

                        {/* Badge engagement */}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${badge.className}`}>
                          {badge.label}
                        </span>

                        {/* Score */}
                        {recipient.engagement_score > 0 && (
                          <span className="text-xs text-text-tertiary font-mono">
                            Score: {recipient.engagement_score}/100
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                        {recipient.recipient.role && (
                          <span>{recipient.recipient.role}</span>
                        )}
                        {recipient.recipient.role && recipient.recipient.organisation && (
                          <span>•</span>
                        )}
                        {recipient.recipient.organisation && (
                          <span className="font-medium">{recipient.recipient.organisation}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-xs text-text-tertiary">
                        <Mail className="w-3 h-3" />
                        <span>{recipient.recipient.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline tracking */}
                  <div className="ml-13 space-y-1.5 text-sm">
                    {/* Envoyé */}
                    <div className="flex items-center gap-2 text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-xs font-medium">Envoyé:</span>
                      </div>
                      <span className="text-xs">{formatDate(recipient.tracking.sent_at)}</span>
                    </div>

                    {/* Ouvert */}
                    {recipient.tracking.open_count > 0 && (
                      <div className="flex items-center gap-2 text-primary">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Ouvert:</span>
                        </div>
                        <span className="text-xs">
                          {lastOpen && formatRelativeTime(lastOpen.event_at)}
                          {recipient.tracking.open_count > 1 && (
                            <span className="ml-1 font-semibold">
                              ({recipient.tracking.open_count}x)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Cliqué */}
                    {recipient.tracking.click_count > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-success">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <MousePointerClick className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Cliqué:</span>
                          </div>
                          <span className="text-xs">
                            {lastClick && formatRelativeTime(lastClick.event_at)}
                            {recipient.tracking.click_count > 1 && (
                              <span className="ml-1 font-semibold">
                                ({recipient.tracking.click_count}x)
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Liste des URLs cliquées */}
                        {recipient.tracking.clicked.length > 0 && (
                          <div className="ml-6 space-y-0.5">
                            {recipient.tracking.clicked.map((click, idx) => (
                              <div key={idx} className="text-xs text-text-tertiary truncate">
                                • {click.url || 'URL non disponible'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rebond */}
                    {recipient.tracking.bounced && (
                      <div className="flex items-center gap-2 text-error">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-error" />
                          <span className="text-xs font-medium">❌ Email rebondi (invalide)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {recipient.recipient.person_id && (
                    <>
                      {/* Bouton Rappeler (lead chaud) */}
                      {recipient.engagement_score >= 40 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onCallClick?.(recipient.recipient.person_id!, recipient)}
                          className="whitespace-nowrap"
                        >
                          <Phone className="w-4 h-4 mr-1.5" />
                          Rappeler
                        </Button>
                      )}

                      {/* Bouton Note */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNoteClick?.(recipient.recipient.person_id!, recipient)}
                        className="whitespace-nowrap"
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Note
                      </Button>

                      {/* Bouton Voir fiche */}
                      <Link href={`/dashboard/people/${recipient.recipient.person_id}`}>
                        <Button variant="ghost" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-1.5" />
                          Fiche
                        </Button>
                      </Link>
                    </>
                  )}

                  {!recipient.recipient.person_id && (
                    <div className="text-xs text-text-tertiary italic">
                      Pas de contact lié
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
