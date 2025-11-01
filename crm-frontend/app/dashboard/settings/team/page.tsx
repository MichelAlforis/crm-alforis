'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Users, UserPlus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import {
  useBillingSummary,
  useTeamOverview,
} from '@/hooks/useSettingsData'
import { PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'

export default function TeamSettingsPage() {
  const { showToast } = useToast()
  const billingSummary = useBillingSummary()
  const { members: teamMembers, pendingInvites } = useTeamOverview()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const handleDownloadInvoice = () => {
    showToast({
      type: 'info',
      title: 'Fonctionnalité à venir',
      message: 'Le téléchargement de factures sera disponible une fois Stripe connecté.',
    })
  }

  const handleInviteSubmit = async () => {
    if (!inviteEmail) {
      showToast({
        type: 'warning',
        title: 'Email requis',
        message: 'Veuillez entrer une adresse email valide.',
      })
      return
    }

    setIsInviting(true)
    setTimeout(() => {
      setIsInviting(false)
      setShowInviteModal(false)
      setInviteEmail('')
      showToast({
        type: 'success',
        title: 'Invitation envoyée',
        message: `Une invitation a été envoyée à ${inviteEmail}`,
      })
    }, 1000)
  }

  return (
    <PageContainer width="default">
      <PageHeader>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-spacing-sm text-fluid-sm text-text-secondary hover:text-text-primary mb-spacing-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux paramètres
        </Link>

        <PageTitle subtitle="Gérez votre abonnement, votre équipe et vos factures">
          Équipe & Facturation
        </PageTitle>
      </PageHeader>

      <PageSection>
      {/* Abonnement & Facturation */}
      <section className="rounded-2xl border border-border bg-surface p-spacing-lg shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-sky-500" />
            <div>
              <h2 className="text-fluid-xl font-semibold text-text-primary">
                Abonnement &amp; facturation
              </h2>
              <p className="text-fluid-sm text-text-secondary">
                Suivez votre offre CRM, la consommation de licences et les
                prochaines échéances.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
            {billingSummary.plan} • {billingSummary.cycle}
          </span>
        </div>

        <div className="mt-spacing-lg grid gap-spacing-lg lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-secondary px-4 py-4">
            <p className="text-xs font-semibold uppercase text-text-secondary">
              Prochaine facture
            </p>
            <p className="mt-2 text-fluid-lg font-semibold text-text-primary">
              {billingSummary.amount}
            </p>
            <p className="text-fluid-sm text-text-secondary">{billingSummary.nextInvoice}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary px-4 py-4">
            <p className="text-xs font-semibold uppercase text-text-secondary">
              Licences utilisées
            </p>
            <p className="mt-2 text-fluid-lg font-semibold text-text-primary">
              {billingSummary.seatsUsed}/{billingSummary.seatsTotal}
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (billingSummary.seatsUsed / billingSummary.seatsTotal) * 100
                  ).toFixed(0)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              Les licences additionnelles seront facturées automatiquement.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary px-4 py-4">
            <p className="text-xs font-semibold uppercase text-text-secondary">
              Moyen de paiement
            </p>
            <p className="mt-2 text-fluid-sm font-semibold text-text-primary">
              Carte • **** 8421
            </p>
            <p className="text-xs text-text-secondary">
              Dernière mise à jour : 12 mars 2024
            </p>
            <button
              onClick={() => alert('La mise à jour du moyen de paiement sera disponible avec Stripe.')}
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-border hover:bg-surface-secondary"
            >
              Mettre à jour
            </button>
          </div>
        </div>

        <div className="mt-spacing-lg flex flex-wrap justify-between gap-spacing-sm text-fluid-sm text-text-secondary">
          <p>
            L&apos;historique détaillé et les factures PDF seront disponibles ici
            une fois Stripe connecté à l&apos;API back-office.
          </p>
          <button
            onClick={handleDownloadInvoice}
            className="inline-flex items-center gap-2 rounded-full border border-sky-500 bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600"
          >
            Télécharger la dernière facture
          </button>
        </div>
      </section>

      {/* Équipe & Accès */}
      <section className="rounded-2xl border border-border bg-surface p-spacing-lg shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-rose-500" />
          <div>
            <h2 className="text-fluid-xl font-semibold text-text-primary">
              Équipe &amp; accès
            </h2>
            <p className="text-fluid-sm text-text-secondary">
              Visualisez qui a accès au CRM et anticipez les prochaines
              invitations.
            </p>
          </div>
        </div>

        <div className="mt-spacing-lg grid gap-spacing-lg lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between gap-spacing-md rounded-xl border border-border px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50/40"
              >
                <div>
                  <p className="text-fluid-sm font-semibold text-text-primary">
                    {member.name}
                  </p>
                  <p className="text-xs text-text-secondary">{member.role}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    member.status === 'Actif'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                  }`}
                >
                  {member.status}
                </span>
              </div>
            ))}
          </div>

          <aside className="rounded-xl border border-border bg-surface-secondary p-4">
            <h3 className="text-fluid-sm font-semibold text-text-primary">
              Invitations en cours
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Les nouveaux collaborateurs recevront un email automatique.
            </p>

            <div className="mt-4 space-y-3">
              {pendingInvites.length === 0 ? (
                <p className="rounded-lg bg-surface px-3 py-2 text-xs text-text-secondary">
                  Aucune invitation en attente.
                </p>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.email}
                    className="rounded-lg bg-surface px-3 py-2 text-xs text-text-primary"
                  >
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-[11px] text-text-secondary">{invite.sentAt}</p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              <UserPlus className="h-4 w-4" />
              Inviter un membre
            </button>
          </aside>
        </div>
      </section>

      {/* Modal Invitation */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInviteModal(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface p-spacing-lg shadow-xl animate-in slide-in-from-bottom duration-300">
            <h3 className="text-fluid-xl font-semibold text-text-primary">
              Inviter un collaborateur
            </h3>
            <p className="mt-2 text-fluid-sm text-text-secondary">
              Entrez l&apos;adresse email du collaborateur à inviter.
            </p>
            <div className="mt-4">
              <label
                htmlFor="invite-email"
                className="block text-fluid-sm font-medium text-text-primary"
              >
                Adresse email
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="collaborateur@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isInviting) {
                    handleInviteSubmit()
                  }
                }}
                disabled={isInviting}
                className="mt-2 w-full rounded-lg border border-border px-4 py-2 text-fluid-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-surface-secondary disabled:cursor-not-allowed"
                autoFocus
              />
            </div>
            <div className="mt-spacing-lg flex justify-end gap-spacing-sm">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                }}
                disabled={isInviting}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-fluid-sm font-medium text-text-primary transition hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleInviteSubmit}
                disabled={isInviting}
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-fluid-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Envoyer l&apos;invitation
              </button>
            </div>
          </div>
        </div>
      )}
      </PageSection>
    </PageContainer>
  )
}
