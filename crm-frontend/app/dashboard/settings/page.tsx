'use client'
import { logger } from '@/lib/logger'
import { storage, PREFERENCES_STORAGE_KEYS } from "@/lib/constants"

import { useState } from 'react'
import clsx from 'clsx'
import {
  Activity,
  Bell,
  Calendar,
  CheckCircle2,
  KeyRound,
  Mail,
  Palette,
  Shield,
  Smartphone,
  Download,
  Loader2,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  Database,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { useSidebar } from '@/hooks/useSidebar'
import { SIDEBAR_SECTIONS } from '@/config/sidebar.config'
import {
  useSecurityEvents,
} from '@/hooks/useSettingsData'
import { usePushNotifications } from '@/hooks/usePushNotifications'

type NotificationOptionKey =
  | 'dailyDigest'
  | 'taskReminders'
  | 'investorUpdates'
  | 'calendarSync'

type SecurityOptionKey = 'twoFactor' | 'loginAlerts'
export default function SettingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const sidebar = useSidebar(SIDEBAR_SECTIONS)
  const securityEvents = useSecurityEvents()
  const {
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    error: pushError,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications()
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

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showNewsletterModal, setShowNewsletterModal] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState(user?.email || '')
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Profile editing state
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

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

  // Handler functions
  const handleEditProfile = () => {
    setShowEditProfileModal(true)
  }

  const handleNewsletterSubscribe = () => {
    setShowNewsletterModal(true)
  }

  const handleConfigureSecurity = () => {
    showToast({
      type: 'info',
      title: 'En développement',
      message: 'La configuration avancée de la sécurité sera disponible prochainement.',
    })
  }

  const handleResetTheme = () => {
    setPreferredTheme('system')
    storage.remove(PREFERENCES_STORAGE_KEYS.THEME)
    showToast({
      type: 'success',
      title: 'Thème réinitialisé',
      message: 'Le thème a été réinitialisé aux valeurs par défaut.',
    })
  }

  const handleSaveTheme = () => {
    storage.set(PREFERENCES_STORAGE_KEYS.THEME, preferredTheme)
    showToast({
      type: 'success',
      title: 'Préférences enregistrées',
      message: `Votre thème "${preferredTheme}" a été sauvegardé.`,
    })
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

  const handleNewsletterSubmit = async () => {
    if (!newsletterEmail) {
      showToast({
        type: 'warning',
        title: 'Email requis',
        message: 'Veuillez entrer une adresse email valide.',
      })
      return
    }

    setIsSubscribing(true)
    // Simuler un délai réseau
    setTimeout(() => {
      setIsSubscribing(false)
      setShowNewsletterModal(false)
      showToast({
        type: 'success',
        title: 'Inscription réussie',
        message: 'Vous recevrez désormais les actualités du CRM.',
      })
    }, 1000)
  }

  const handleSaveProfile = async () => {
    // Validation
    if (newPassword && newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Les mots de passe ne correspondent pas.',
      })
      return
    }

    if (newPassword && newPassword.length < 6) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Le mot de passe doit contenir au moins 6 caractères.',
      })
      return
    }

    if (newPassword && !currentPassword) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez entrer votre mot de passe actuel.',
      })
      return
    }

    setIsSavingProfile(true)

    try {
      // Mettre à jour le mot de passe si demandé
      if (newPassword && currentPassword) {
        await apiClient.changePassword({
          current_password: currentPassword,
          new_password: newPassword,
        })
      }

      // Mettre à jour le nom si modifié
      if (fullName && fullName.trim()) {
        await apiClient.updateProfile({ full_name: fullName })
      }

      showToast({
        type: 'success',
        title: 'Profil mis à jour',
        message: 'Vos modifications ont été enregistrées avec succès.',
      })

      // Réinitialiser les champs et fermer le modal
      setShowEditProfileModal(false)
      setFullName('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour du profil:', error)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.detail || 'Impossible de mettre à jour le profil.',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
          <Shield className="h-3.5 w-3.5" />
          Paramètres Généraux
        </span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Profil & Préférences</h1>
        <p className="text-gray-600 dark:text-slate-400 max-w-2xl">
          Gérez votre profil, notifications, sécurité et personnalisez l&apos;apparence de votre CRM.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Profil &amp; compte
              </h2>
              <p className="text-sm text-gray-500">
                Informations générales utilisées pour personnaliser vos accès.
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>

          <dl className="mt-6 grid gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3">
              <dt className="text-xs font-semibold uppercase text-gray-500">
                Adresse e-mail
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
                {user?.email || 'utilisateur@example.com'}
              </dd>
              <p className="mt-1 text-xs text-gray-500">
                Utilisée pour vous connecter et recevoir les notifications clés.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3">
              <dt className="text-xs font-semibold uppercase text-gray-500">
                Rôle
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
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
              className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Modifier le profil
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

      {/* Section Push Notifications en pleine largeur */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Smartphone className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Notifications Push
            </h2>
            <p className="text-sm text-gray-500">
              Recevez des notifications en temps réel sur votre appareil.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {/* Statut actuel */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3">
              <dt className="text-xs font-semibold uppercase text-gray-500">
                Statut
              </dt>
              <dd className="mt-2 flex items-center gap-2">
                {isPushSubscribed ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">
                      Notifications activées
                    </span>
                  </>
                ) : pushPermission === 'denied' ? (
                  <>
                    <Shield className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Permission refusée
                    </span>
                  </>
                ) : (
                  <>
                    <Bell className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                      Non activé
                    </span>
                  </>
                )}
              </dd>
              {pushPermission === 'denied' && (
                <p className="mt-2 text-xs text-red-600">
                  Vous avez bloqué les notifications. Pour les réactiver, allez dans les paramètres de votre navigateur :
                  Chrome → Paramètres → Confidentialité et sécurité → Paramètres des sites → Notifications
                </p>
              )}
            </div>

            {/* Afficher l'erreur s'il y en a une */}
            {pushError && !isPushSubscribed && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{pushError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!isPushSubscribed ? (
                <button
                  onClick={async () => {
                    const success = await subscribeToPush()
                    if (success) {
                      showToast({
                        type: 'success',
                        title: 'Notifications activées',
                        message: 'Vous recevrez désormais des notifications push.',
                      })
                    } else if (pushPermission === 'denied') {
                      showToast({
                        type: 'error',
                        title: 'Permission refusée',
                        message: 'Veuillez autoriser les notifications dans les paramètres de votre navigateur.',
                      })
                    }
                  }}
                  disabled={isPushLoading || pushPermission === 'denied'}
                  className="flex-1 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPushLoading ? 'Activation...' : 'Activer les notifications'}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const success = await unsubscribeFromPush()
                    if (success) {
                      showToast({
                        type: 'info',
                        title: 'Notifications désactivées',
                        message: 'Vous ne recevrez plus de notifications push.',
                      })
                    }
                  }}
                  disabled={isPushLoading}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPushLoading ? 'Désactivation...' : 'Désactiver les notifications'}
                </button>
              )}
            </div>
          </div>

          {/* Info à droite */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 h-fit">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Comment ça marche ?</h3>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li>• Les notifications fonctionnent même quand l&apos;app est fermée</li>
              <li>• Vous recevrez des alertes pour les tâches et rappels</li>
              <li>• Cliquez sur une notification pour ouvrir l&apos;app directement</li>
              <li>• Vous pouvez désactiver à tout moment</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-amber-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
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
                      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-slate-100">{title}</span>
                    </span>
                    <span className="text-sm text-gray-500">{description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
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
                      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                    />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-gray-900 dark:text-slate-100">{title}</span>
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

      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-purple-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
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
              className="mt-2 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="system">Automatique (selon l&apos;appareil)</option>
              <option value="clair">Mode clair</option>
              <option value="sombre">Mode sombre</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
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
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800"
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

      {/* 🆕 SECTION: Personnalisation Sidebar */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Personnalisation de la sidebar
            </h2>
            <p className="text-sm text-gray-500">
              Masquez les sections que vous n&apos;utilisez pas pour simplifier votre navigation.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {SIDEBAR_SECTIONS.map((section) => {
            const SectionIcon = section.icon
            const isHidden = sidebar.isSectionHidden(section.href)
            const isFavorite = sidebar.isFavorite(section.href)

            return (
              <div
                key={section.href}
                className={clsx(
                  'rounded-xl border px-5 py-4 transition-all',
                  isHidden
                    ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 opacity-60'
                    : 'border-indigo-100 bg-indigo-50/50 hover:border-indigo-200 hover:bg-indigo-50'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isHidden ? 'bg-gray-200' : 'bg-indigo-100'
                    )}>
                      <SectionIcon className={clsx(
                        'h-5 w-5',
                        isHidden ? 'text-gray-500' : 'text-indigo-600'
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {section.label}
                        </h3>
                        {isFavorite && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                            ⭐ Favori
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{section.description}</p>
                      {section.submenu && section.submenu.length > 0 && (
                        <p className="mt-1 text-[11px] text-indigo-600">
                          {section.submenu.length} sous-section{section.submenu.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sidebar.toggleSectionVisibility(section.href)
                      showToast({
                        type: isHidden ? 'success' : 'info',
                        title: isHidden ? 'Section affichée' : 'Section masquée',
                        message: `"${section.label}" est maintenant ${isHidden ? 'visible' : 'masquée'} dans la sidebar.`,
                      })
                    }}
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all',
                      isHidden
                        ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:border-gray-400 hover:bg-gray-50 dark:bg-slate-800'
                    )}
                  >
                    {isHidden ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Afficher
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Masquer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <LayoutDashboard className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-700">
              <p className="font-semibold">À propos de cette fonctionnalité</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Les sections masquées ne sont plus visibles dans la sidebar</li>
                <li>• Vos préférences sont sauvegardées localement</li>
                <li>• Vous pouvez ajouter des sections aux favoris avec l&apos;icône ⭐</li>
                <li>• Les sections masquées restent accessibles via l&apos;URL directe</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center text-sm">
          <p className="text-gray-500">
            {sidebar.hiddenSections.length} section{sidebar.hiddenSections.length > 1 ? 's' : ''} masquée{sidebar.hiddenSections.length > 1 ? 's' : ''} • {sidebar.favorites.length} favori{sidebar.favorites.length > 1 ? 's' : ''}
          </p>
          {sidebar.hiddenSections.length > 0 && (
            <button
              onClick={() => {
                sidebar.hiddenSections.forEach((href) => {
                  sidebar.toggleSectionVisibility(href)
                })
                showToast({
                  type: 'success',
                  title: 'Toutes les sections affichées',
                  message: 'La sidebar a été réinitialisée.',
                })
              }}
              className="rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              Tout réafficher
            </button>
          )}
        </div>
      </section>

      {/* RGPD Section */}
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Mes données personnelles (RGPD)
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Gérez vos données conformément au Règlement Général sur la Protection des Données
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Export My Data */}
          <a
            href="/dashboard/settings/rgpd/my-data"
            className="group rounded-xl border border-blue-200 bg-white dark:bg-slate-900 p-4 transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Exporter/Supprimer mes données</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Téléchargez toutes vos données ou exercez votre droit à l'oubli (Articles 15 & 17)
                </p>
              </div>
            </div>
          </a>

          {/* Access Logs (Admin only) */}
          {user?.is_admin && (
            <a
              href="/dashboard/settings/rgpd/access-logs"
              className="group rounded-xl border border-purple-200 bg-white dark:bg-slate-900 p-4 transition hover:border-purple-400 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Logs d'accès CNIL</h3>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">Admin</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Traçabilité des accès aux données personnelles (conformité CNIL)
                  </p>
                </div>
              </div>
            </a>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs text-blue-800">
            <strong>Vos droits RGPD:</strong> Droit d'accès, droit à la portabilité, droit à l'oubli, droit de rectification.
            Pour toute question, contactez notre DPO à <a href="mailto:dpo@alforis.fr" className="underline hover:text-blue-900">dpo@alforis.fr</a>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-emerald-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
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
            <thead className="bg-gray-50 dark:bg-slate-800 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Événement</th>
                <th className="px-4 py-3">Détails</th>
                <th className="px-4 py-3">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:bg-slate-900">
              {securityEvents.map((event) => (
                <tr key={event.id} className="transition hover:bg-emerald-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                    {event.context}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{event.detail}</td>
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
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger le journal
          </button>
        </div>
      </section>

      {/* Modal - Modifier le profil */}
      {showEditProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false)
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Modifier le profil
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Modifiez votre nom complet et/ou votre mot de passe.
            </p>

            <div className="mt-6 space-y-4">
              {/* Nom complet */}
              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Nom complet
                </label>
                <input
                  id="full-name"
                  type="text"
                  placeholder={user?.name || "Votre nom complet"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSavingProfile}
                  className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Laissez vide pour ne pas modifier
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-900 px-2 text-gray-500 uppercase font-semibold">Changer le mot de passe (optionnel)</span>
                </div>
              </div>

              {/* Mot de passe actuel */}
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Mot de passe actuel
                </label>
                <input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSavingProfile}
                  className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
                />
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Nouveau mot de passe
                </label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSavingProfile}
                  className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
                />
              </div>

              {/* Confirmer nouveau mot de passe */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Retapez le nouveau mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSavingProfile) {
                      handleSaveProfile()
                    }
                  }}
                  disabled={isSavingProfile}
                  className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
                />
              </div>

              {newPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600">
                  ⚠️ Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditProfileModal(false)
                  setFullName('')
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                disabled={isSavingProfile}
                className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || (newPassword && newPassword !== confirmPassword)}
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - S'inscrire à la newsletter */}
      {showNewsletterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewsletterModal(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              S&apos;inscrire à la newsletter
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Recevez chaque mois les dernières actualités et améliorations du
              CRM directement dans votre boîte mail.
            </p>
            <div className="mt-4">
              <label
                htmlFor="newsletter-email"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Votre adresse email
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubscribing) {
                    handleNewsletterSubmit()
                  }
                }}
                disabled={isSubscribing}
                className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowNewsletterModal(false)}
                disabled={isSubscribing}
                className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleNewsletterSubmit}
                disabled={isSubscribing}
                className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSubscribing && <Loader2 className="h-4 w-4 animate-spin" />}
                S&apos;inscrire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
