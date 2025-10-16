'use client'

/**
 * Temporary settings data hooks.
 *
 * These hooks encapsulate the placeholder data currently rendered on the
 * settings page. They are meant to be replaced with real API calls once the
 * back-end endpoints are available.
 *
 * TODO:
 *  - Replace hard-coded values with calls to billing/team/security services.
 *  - Handle loading states, errors, and optimistic updates if required.
 *  - Move the shared types to `@/lib/types` once the data models are finalised.
 */

import { useMemo } from 'react'

type BillingSummary = {
  plan: string
  cycle: string
  seatsUsed: number
  seatsTotal: number
  nextInvoice: string
  amount: string
}

type TeamMember = {
  name: string
  role: string
  status: 'Actif' | 'En pause'
}

type PendingInvite = {
  email: string
  sentAt: string
}

type SecurityEvent = {
  id: number
  context: string
  detail: string
  time: string
}

export type IntegrationOptionKey =
  | 'slack'
  | 'notion'
  | 'zapier'
  | 'webhook'

type IntegrationDetail = {
  key: IntegrationOptionKey
  name: string
  description: string
  category: string
  docsLabel: string
}

export function useBillingSummary(): BillingSummary {
  // TODO: replace with billing API call (Stripe / internal invoicing)
  return useMemo(
    () => ({
      plan: 'Scale',
      cycle: 'Mensuel',
      seatsUsed: 8,
      seatsTotal: 15,
      nextInvoice: '30 avril 2024',
      amount: '450 € HT',
    }),
    []
  )
}

export function useTeamOverview(): {
  members: TeamMember[]
  pendingInvites: PendingInvite[]
} {
  // TODO: replace with user management service
  return useMemo(
    () => ({
      members: [
        { name: 'Alice Martin', role: 'Investissements', status: 'Actif' },
        { name: 'Louis Bernard', role: 'Rel Gestion', status: 'Actif' },
        { name: 'Fatima Rahmani', role: 'Analyse', status: 'En pause' },
      ],
      pendingInvites: [
        { email: 'prenom@investeur.fr', sentAt: 'Envoyé il y a 2 jours' },
      ],
    }),
    []
  )
}

export function useSecurityEvents(): SecurityEvent[] {
  // TODO: expose security audit logs via back-end API
  return useMemo(
    () => [
      {
        id: 1,
        context: 'Connexion réussie',
        detail: 'MacBook • Paris, France',
        time: 'Il y a 3 heures',
      },
      {
        id: 2,
        context: 'Export CSV réalisé',
        detail: 'Module investisseurs',
        time: 'Hier, 11:24',
      },
      {
        id: 3,
        context: 'Tentative bloquée',
        detail: 'Appareil inconnu • Lyon, France',
        time: 'Hier, 07:48',
      },
    ],
    []
  )
}

export function useIntegrationsConfig(): {
  details: IntegrationDetail[]
  initialState: Record<IntegrationOptionKey, boolean>
} {
  // TODO: fetch integration status once connector service is available
  return useMemo(
    () => ({
      details: [
        {
          key: 'slack',
          name: 'Slack',
          description:
            'Recevez les alertes de tâches critiques directement dans vos canaux #crm.',
          category: 'Productivité',
          docsLabel: 'Webhook Slack',
        },
        {
          key: 'notion',
          name: 'Notion',
          description:
            'Synchronisez vos fiches investisseurs avec une base Notion partagée.',
          category: 'Base de connaissances',
          docsLabel: 'Template Notion',
        },
        {
          key: 'zapier',
          name: 'Zapier',
          description:
            "Automatisez l'enrichissement de contacts et la création de deals.",
          category: 'Automatisation',
          docsLabel: 'Zap préconfiguré',
        },
        {
          key: 'webhook',
          name: 'Webhooks API',
          description:
            'Déclenchez vos propres workflows externes lors des mises à jour clés.',
          category: 'Tech',
          docsLabel: 'Documentation API',
        },
      ],
      initialState: {
        slack: true,
        notion: false,
        zapier: false,
        webhook: true,
      },
    }),
    []
  )
}
