'use client'

import { useState } from 'react'
import {
  Activity,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  Globe,
  Link as LinkIcon,
  KeyRound,
  Mail,
  Palette,
  Shield,
  Smartphone,
  UserPlus,
  Users,
  Download,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useBillingSummary,
  useTeamOverview,
  useSecurityEvents,
  useIntegrationsConfig,
  type IntegrationOptionKey,
} from '@/hooks/useSettingsData'

type NotificationOptionKey =
  | 'dailyDigest'
  | 'taskReminders'
  | 'investorUpdates'
  | 'calendarSync'

type SecurityOptionKey = 'twoFactor' | 'loginAlerts'
export default function SettingsPage() {
  const { user } = useAuth()
  const billingSummary = useBillingSummary()
  const { members: teamMembers, pendingInvites } = useTeamOverview()
  const securityEvents = useSecurityEvents()
  const { details: integrationDetails, initialState: integrationInitialState } =
    useIntegrationsConfig()
  const [notificationOptions, setNotificationOptions] = useState<
    Record<NotificationOptionKey, boolean>
  >({
    dailyDigest: true,
    taskReminders: true,
    investorUpdates: false,
    calendarSync: false,
  })
  const [securityOptions, setSecurityOptions] = useState<
    Record<SecurityOptionKey, boolean>
  >({
    twoFactor: false,
    loginAlerts: true,
  })
  const [preferredTheme, setPreferredTheme] = useState<
    'system' | 'clair' | 'sombre'
  >('system')
  const [integrations, setIntegrations] = useState<
    Record<IntegrationOptionKey, boolean>
  >(integrationInitialState)

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showNewsletterModal, setShowNewsletterModal] = useState(false)

  const toggleNotification = (key: NotificationOptionKey) => {
    setNotificationOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleSecurity = (key: SecurityOptionKey) => {
    setSecurityOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleIntegration = (key: IntegrationOptionKey) => {
    setIntegrations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Handler functions
  const handleEditProfile = () => {
    setShowEditProfileModal(true)
  }

  const handleInviteCollaborator = () => {
    setShowInviteModal(true)
  }

  const handleNewsletterSubscribe = () => {
    setShowNewsletterModal(true)
  }

  const handleDownloadInvoice = () => {
    alert('Le téléchargement de factures sera disponible une fois Stripe connecté.')
  }

  const handleConfigureSecurity = () => {
    alert('La configuration de la sécurité sera disponible prochainement.')
  }

  const handleResetTheme = () => {
    setPreferredTheme('system')
    alert('Thème réinitialisé aux valeurs par défaut.')
  }

  const handleSaveTheme = () => {
    localStorage.setItem('preferred_theme', preferredTheme)
    alert('Vos préférences de thème ont été enregistrées localement.')
  }

  const handleDownloadSecurityLog = () => {
    const csvContent = [
      'Événement,Détails,Horodatage',
      ...securityEvents.map(
        (event) => `"${event.context}","${event.detail}","${event.time}"`
      ),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `security_log_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenIntegrationDocs = (integrationName: string) => {
    alert(`Documentation pour ${integrationName} : sera disponible prochainement.`)
  }
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
          <Shield className="h-3.5 w-3.5" />
          Paramètres
        </span>
        <h1 className="text-3xl font-bold text-gray-900">Centre de contrôle</h1>
        <p className="text-gray-600 max-w-2xl">
          Personnalisez votre expérience : notifications, sécurité, préférences
          d&apos;interface. Tout ce qui concerne votre compte est centralisé ici.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Profil &amp; compte
              </h2>
              <p className="text-sm text-gray-500">
                Informations générales utilisées pour personnaliser vos accès.
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>

          <dl className="mt-6 grid gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase text-gray-500">
                Adresse e-mail
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {user?.email || 'utilisateur@example.com'}
              </dd>
              <p className="mt-1 text-xs text-gray-500">
                Utilisée pour vous connecter et recevoir les notifications clés.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase text-gray-500">
                Rôle
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                Administrateur
              </dd>
              <p className="mt-1 text-xs text-gray-500">
                Les permissions fines arrivent prochainement pour les équipes.
              </p>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleEditProfile}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              Modifier le profil
            </button>
            <button
              onClick={handleInviteCollaborator}
              className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Inviter un collaborateur
            </button>
          </div>
        </div>

        <aside className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-indigo-500" />
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">
                Nouveautés produit
              </h3>
              <p className="text-xs text-indigo-700/80">
                Recevez un résumé mensuel des améliorations CRM.
              </p>
            </div>
          </div>
          <button
            onClick={handleNewsletterSubscribe}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-indigo-500 px-4 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-500 hover:text-white"
          >
            S&apos;inscrire à la newsletter
          </button>
        </aside>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-sky-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
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
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Prochaine facture
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {billingSummary.amount}
            </p>
            <p className="text-sm text-gray-500">{billingSummary.nextInvoice}</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Licences utilisées
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
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

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Moyen de paiement
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              Carte • **** 8421
            </p>
            <p className="text-xs text-gray-500">
              Dernière mise à jour : 12 mars 2024
            </p>
            <button
              onClick={() => alert('La mise à jour du moyen de paiement sera disponible avec Stripe.')}
              className="mt-3 inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
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

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-rose-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
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
                  <p className="text-sm font-semibold text-gray-900">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    member.status === 'Actif'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {member.status}
                </span>
              </div>
            ))}
          </div>

          <aside className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Invitations en cours
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Les nouveaux collaborateurs recevront un email automatique.
            </p>

            <div className="mt-4 space-y-3">
              {pendingInvites.length === 0 ? (
                <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
                  Aucune invitation en attente.
                </p>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.email}
                    className="rounded-lg bg-white px-3 py-2 text-xs text-gray-700"
                  >
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-[11px] text-gray-500">{invite.sentAt}</p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleInviteCollaborator}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              <UserPlus className="h-4 w-4" />
              Inviter un membre
            </button>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-amber-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Notifications
              </h2>
              <p className="text-sm text-gray-500">
                Choisissez les alertes qui vous aident à rester à jour.
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {(
              [
                {
                  key: 'dailyDigest',
                  title: 'Résumé quotidien',
                  description:
                    'Recevoir chaque matin un récapitulatif des tâches et deals à traiter.',
                  icon: Calendar,
                },
                {
                  key: 'taskReminders',
                  title: 'Relances tâches',
                  description:
                    'Notifications push et email pour les tâches à échéance proche.',
                  icon: Smartphone,
                },
                {
                  key: 'investorUpdates',
                  title: 'Actualités investisseurs',
                  description:
                    'Alertes sur les mouvements clés des investisseurs suivis.',
                  icon: Mail,
                },
                {
                  key: 'calendarSync',
                  title: 'Synchronisation agenda',
                  description:
                    'Envoi automatique des interactions dans votre calendrier.',
                  icon: Calendar,
                },
              ] as Array<{
                key: NotificationOptionKey
                title: string
                description: string
                icon: typeof Bell
              }>
            ).map(({ key, title, description, icon: Icon }) => (
              <li
                key={key}
                className="rounded-xl border border-gray-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                <label className="flex cursor-pointer items-start gap-4">
                  <span className="mt-1">
                    <input
                      type="checkbox"
                      checked={notificationOptions[key]}
                      onChange={() => toggleNotification(key)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-gray-900">{title}</span>
                    </span>
                    <span className="text-sm text-gray-500">{description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Sécurité
              </h2>
              <p className="text-sm text-gray-500">
                Renforcez la protection de votre compte et définissez les
                alertes critiques.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {(
              [
                {
                  key: 'twoFactor',
                  title: 'Double authentification',
                  description:
                    'Ajoutez une vérification par SMS ou application pour chaque connexion.',
                  icon: KeyRound,
                },
                {
                  key: 'loginAlerts',
                  title: 'Alertes de connexion',
                  description:
                    'Recevoir un email lorsqu\'une connexion est détectée sur un nouvel appareil.',
                  icon: Smartphone,
                },
              ] as Array<{
                key: SecurityOptionKey
                title: string
                description: string
                icon: typeof Shield
              }>
            ).map(({ key, title, description, icon: Icon }) => (
              <div
                key={key}
                className="rounded-xl border border-gray-100 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/60"
              >
                <label className="flex cursor-pointer items-start gap-4">
                  <span className="mt-1">
                    <input
                      type="checkbox"
                      checked={securityOptions[key]}
                      onChange={() => toggleSecurity(key)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-gray-900">{title}</span>
                    </span>
                    <span className="text-sm text-gray-500">{description}</span>
                  </span>
                </label>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfigureSecurity}
            className="mt-6 w-full rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Configurer maintenant
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-purple-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Apparence &amp; confort
            </h2>
            <p className="text-sm text-gray-500">
              Adaptez l&apos;interface à votre environnement de travail.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <label
              htmlFor="theme"
              className="text-xs font-semibold uppercase text-gray-500"
            >
              Thème
            </label>
            <select
              id="theme"
              value={preferredTheme}
              onChange={(event) =>
                setPreferredTheme(event.target.value as typeof preferredTheme)
              }
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="system">Automatique (selon l&apos;appareil)</option>
              <option value="clair">Mode clair</option>
              <option value="sombre">Mode sombre</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Le mode sombre est en bêta et sera synchronisé avec les préférences
            de vos collaborateurs lors du prochain sprint.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <p className="text-sm text-gray-500">
            Ces réglages seront bientôt synchronisés avec l&apos;API. Pour le
            moment ils sont stockés localement.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleResetTheme}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleSaveTheme}
              className="rounded-lg border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-emerald-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Journal de sécurité
            </h2>
            <p className="text-sm text-gray-500">
              Historique des connexions, exports et actions sensibles sur les 30
              derniers jours.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Événement</th>
                <th className="px-4 py-3">Détails</th>
                <th className="px-4 py-3">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {securityEvents.map((event) => (
                <tr key={event.id} className="transition hover:bg-emerald-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {event.context}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.detail}</td>
                  <td className="px-4 py-3 text-gray-500">{event.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-gray-500">
          <p>
            Les journaux complets seront exportables (CSV, JSON) lorsque la
            télémétrie back-end sera branchée.
          </p>
          <button
            onClick={handleDownloadSecurityLog}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-white px-3 py-1.5 font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger le journal
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Connecteurs &amp; intégrations
            </h2>
            <p className="text-sm text-gray-500">
              Activez des ponts avec vos outils existants pour fluidifier les
              processus.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {integrationDetails.map(
            ({ key, name, description, category, docsLabel }) => (
              <div
                key={key}
                className="flex flex-col rounded-xl border border-gray-100 p-5 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <LinkIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {name}
                      </h3>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {category}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <span>{integrations[key] ? 'Activé' : 'Inactif'}</span>
                    <input
                      type="checkbox"
                      checked={integrations[key]}
                      onChange={() => toggleIntegration(key)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
                <p className="mt-4 flex-1 text-sm text-gray-600">
                  {description}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-blue-600">
                    Bientôt synchronisé
                  </span>
                  <button
                    onClick={() => handleOpenIntegrationDocs(name)}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-500 px-3 py-1 font-semibold text-blue-600 transition hover:bg-blue-500 hover:text-white"
                  >
                    {docsLabel}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Les connecteurs utiliseront le service d&apos;intégration (Node) côté
          back-office. Ajoutez ici les webhooks/IDs nécessaires une fois les
          secrets stockés dans Vault.
        </p>
      </section>

      {/* Modal - Modifier le profil */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">
              Modifier le profil
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              La modification de profil sera disponible prochainement. Vous
              pourrez modifier votre nom, email et photo.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Inviter un collaborateur */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">
              Inviter un collaborateur
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Entrez l&apos;adresse email du collaborateur à inviter.
            </p>
            <div className="mt-4">
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-gray-700"
              >
                Adresse email
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="collaborateur@example.com"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert('Invitation envoyée ! (fonctionnalité en développement)')
                  setShowInviteModal(false)
                }}
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Envoyer l&apos;invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - S'inscrire à la newsletter */}
      {showNewsletterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">
              S&apos;inscrire à la newsletter
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Recevez chaque mois les dernières actualités et améliorations du
              CRM directement dans votre boîte mail.
            </p>
            <div className="mt-4">
              <label
                htmlFor="newsletter-email"
                className="block text-sm font-medium text-gray-700"
              >
                Votre adresse email
              </label>
              <input
                id="newsletter-email"
                type="email"
                defaultValue={user?.email || ''}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowNewsletterModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert('Inscription réussie ! (fonctionnalité en développement)')
                  setShowNewsletterModal(false)
                }}
                className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                S&apos;inscrire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
