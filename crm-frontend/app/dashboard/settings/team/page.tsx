'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Users, UserPlus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import {
  useBillingSummary,
  useTeamOverview,
} from '@/hooks/useSettingsData'

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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white dark:text-slate-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux paramètres
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Équipe & Facturation</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Gérez votre abonnement, votre équipe et vos factures
        </p>
      </div>

      {/* Abonnement & Facturation */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-sky-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Abonnement &amp; facturation
              </h2>
              <p className="text-sm text-gray-500">
                Suivez votre offre CRM, la consommation de licences et les
                prochaines échéances.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
            {billingSummary.plan} • {billingSummary.cycle}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Prochaine facture
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
              {billingSummary.amount}
            </p>
            <p className="text-sm text-gray-500">{billingSummary.nextInvoice}</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Licences utilisées
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
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
            <p className="mt-2 text-xs text-gray-500">
              Les licences additionnelles seront facturées automatiquement.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Moyen de paiement
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
              Carte • **** 8421
            </p>
            <p className="text-xs text-gray-500">
              Dernière mise à jour : 12 mars 2024
            </p>
            <button
              onClick={() => alert('La mise à jour du moyen de paiement sera disponible avec Stripe.')}
              className="mt-3 inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800"
            >
              Mettre à jour
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-gray-500">
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
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-rose-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Équipe &amp; accès
            </h2>
            <p className="text-sm text-gray-500">
              Visualisez qui a accès au CRM et anticipez les prochaines
              invitations.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50/40"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500">{member.role}</p>
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

          <aside className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              Invitations en cours
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Les nouveaux collaborateurs recevront un email automatique.
            </p>

            <div className="mt-4 space-y-3">
              {pendingInvites.length === 0 ? (
                <p className="rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-500">
                  Aucune invitation en attente.
                </p>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.email}
                    className="rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300"
                  >
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-[11px] text-gray-500">{invite.sentAt}</p>
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
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Inviter un collaborateur
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Entrez l&apos;adresse email du collaborateur à inviter.
            </p>
            <div className="mt-4">
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
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
                className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                }}
                disabled={isInviting}
                className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleInviteSubmit}
                disabled={isInviting}
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Envoyer l&apos;invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
