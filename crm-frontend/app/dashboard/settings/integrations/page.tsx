'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from "@/lib/constants"
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Webhook,
  XCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/components/ui/Toast'
import { useEmailConfig, type EmailConfiguration } from '@/hooks/useEmailConfig'
import {
  useWebhooks,
  useUpdateWebhook,
} from '@/hooks/useWebhooks'
import {
  useAutofillLeaderboard,
  useAutofillStats,
  useAutofillTimeline,
} from '@/hooks/useAutofillStats'
import type { Webhook as WebhookType } from '@/lib/types'
import AIConfigSection from './AIConfigSection'
import OutlookConnector from '@/components/integrations/OutlookConnector'
import EmailAccountsManager from '@/components/integrations/EmailAccountsManager'
import { PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'

type Tab = 'email' | 'webhooks' | 'ai' | 'connectors'

export default function IntegrationsSettingsPage() {
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'email',
  )

  // ------- Email configuration --------
  const {
    getActiveConfiguration,
    testConfiguration,
  } = useEmailConfig()
  const [activeEmailConfig, setActiveEmailConfig] = useState<EmailConfiguration | null>(null)
  const [isLoadingEmail, setIsLoadingEmail] = useState(true)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isTestingEmail, setIsTestingEmail] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchActiveConfig = async () => {
      setIsLoadingEmail(true)
      setEmailError(null)
      try {
        const config = await getActiveConfiguration()
        if (!cancelled) {
          setActiveEmailConfig(config)
        }
      } catch (error: any) {
        if (!cancelled) {
          setEmailError(error?.message ?? 'Impossible de charger la configuration email')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEmail(false)
        }
      }
    }

    void fetchActiveConfig()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopySender = () => {
    if (!activeEmailConfig?.from_email) {
      showToast({
        type: 'warning',
        title: 'Aucune adresse',
        message: "Ajoutez d'abord un expéditeur dans la configuration email.",
      })
      return
    }

    navigator.clipboard.writeText(activeEmailConfig.from_email).then(() => {
      showToast({
        type: 'success',
        title: 'Adresse copiée',
        message: `${activeEmailConfig.from_email} a été copiée`,
      })
    })
  }

  const handleTestEmail = async () => {
    if (!activeEmailConfig) {
      showToast({
        type: 'warning',
        title: 'Pas de configuration active',
        message: 'Ajoutez ou activez une configuration email avant de tester.',
      })
      return
    }

    const target = window.prompt('Envoyer un email de test à :', '')
    if (!target) return

    setIsTestingEmail(true)
    try {
      const result = await testConfiguration(activeEmailConfig.id, target)
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Email envoyé',
          message: `Test envoyé via ${result.provider.toUpperCase()}`,
        })
      } else {
        showToast({
          type: 'error',
          title: 'Test échoué',
          message: result.error ?? 'Le fournisseur a refusé le test.',
        })
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur lors du test',
        message: error?.message ?? 'Impossible de contacter le fournisseur.',
      })
    } finally {
      setIsTestingEmail(false)
    }
  }

  const emailStatus: 'connected' | 'disconnected' =
    activeEmailConfig && !emailError ? 'connected' : 'disconnected'

  // ------- Webhooks --------
  const {
    data: webhooksData,
    isLoading: isLoadingWebhooks,
    error: webhooksError,
  } = useWebhooks()
  const updateWebhook = useUpdateWebhook()
  const isWebhookMutating = updateWebhook.status === 'pending'

  const handleToggleWebhook = (webhook: WebhookType) => {
    updateWebhook.mutate(
      {
        id: webhook.id,
        data: { is_active: !webhook.is_active },
      },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: webhook.is_active ? 'Webhook désactivé' : 'Webhook activé',
            message: webhook.url,
          })
        },
        onError: (error: any) => {
          showToast({
            type: 'error',
            title: 'Impossible de sauvegarder',
            message: error?.message ?? 'Erreur lors de la mise à jour du webhook',
          })
        },
      },
    )
  }

  // ------- Autofill stats (AI tab) --------
  const {
    data: autofillStats,
    isLoading: isLoadingAutofillStats,
  } = useAutofillStats(14)
  const { data: autofillTimeline } = useAutofillTimeline(7)
  const { data: autofillLeaderboard } = useAutofillLeaderboard()

  const topSourceMix = useMemo(() => {
    if (!autofillStats) return []
    return Object.entries(autofillStats.source_mix)
      .filter(([, value]) => value.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
  }, [autofillStats])

  const timelinePreview = autofillTimeline?.timeline ?? []
  const leaderboardPreview = autofillLeaderboard?.leaderboard.slice(0, 5) ?? []

  const tabs = [
    { id: 'email' as Tab, label: 'Email', icon: Mail },
    { id: 'webhooks' as Tab, label: 'Webhooks', icon: Webhook },
    { id: 'ai' as Tab, label: 'Intelligence Artificielle', icon: Brain },
    { id: 'connectors' as Tab, label: 'Connecteurs', icon: Link2 },
  ]

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/dashboard/settings/integrations?tab=${tab}`, { scroll: false })
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

        <PageTitle subtitle="Connectez votre CRM avec vos outils externes et pilotez l'automatisation">
          Intégrations
        </PageTitle>
      </PageHeader>

      <PageSection>
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={clsx(
                'flex items-center gap-spacing-sm py-4 px-1 border-b-2 font-medium text-fluid-sm whitespace-nowrap transition',
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border',
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-spacing-2xl">
        {activeTab === 'email' && (
          <>
            <section className="rounded-2xl border border-border bg-surface p-spacing-lg shadow-sm">
            <div className="flex items-center gap-spacing-sm mb-spacing-lg">
              <Mail className="h-6 w-6 text-blue-500" />
              <div>
                <h2 className="text-fluid-xl font-semibold text-text-primary">
                  Fournisseur d'envoi
                </h2>
                <p className="text-fluid-sm text-text-secondary">
                  Gérez l'API utilisée pour vos emails transactionnels.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-secondary p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Provider actif
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {activeEmailConfig?.provider?.toUpperCase() ?? 'Non configuré'}
                  </p>
                  {activeEmailConfig?.from_email && (
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Expéditeur :{' '}
                      <span className="font-medium">{activeEmailConfig.from_email}</span>
                    </p>
                  )}
                </div>
                <span
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                    emailStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
                  )}
                >
                  {emailStatus === 'connected' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connecté
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Non configuré
                    </>
                  )}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {isLoadingEmail ? (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement de la configuration…
                  </div>
                ) : emailError ? (
                  <p className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {emailError}
                  </p>
                ) : activeEmailConfig ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleCopySender}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800 transition"
                    >
                      <Copy className="h-4 w-4" />
                      Copier l’adresse expéditeur
                    </button>
                    <button
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      {isTestingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Tester l’envoi
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Aucun provider n’est encore défini. Configurez Resend, Sendgrid ou Mailgun pour
                    envoyer vos emails transactionnels.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <button
                    onClick={() => router.push(ROUTES.SETTINGS.EMAIL_APIS)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800 transition"
                  >
                    Ouvrir la gestion complète
                  </button>
                  <span>
                    Besoin d’aide ? Consultez la{' '}
                    <a
                      className="text-blue-600 hover:underline"
                      href="https://resend.com/docs"
                      target="_blank"
                      rel="noreferrer"
                    >
                      documentation Resend
                    </a>
                  </span>
                </div>
              </div>
            </div>
            </section>

            {/* Multi-Mail Accounts Manager */}
            <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm mt-6">
              <EmailAccountsManager />
            </section>
          </>
        )}

        {activeTab === 'webhooks' && (
          <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Webhook className="h-6 w-6 text-purple-500" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Webhooks sortants</h2>
                  <p className="text-sm text-gray-500">
                    Déclenchez vos automatisations sur les événements clés du CRM.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(ROUTES.SETTINGS.WEBHOOKS)}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
              >
                Gérer les webhooks
              </button>
            </div>

            {isLoadingWebhooks ? (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des webhooks…
              </div>
            ) : webhooksError ? (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {webhooksError instanceof Error
                  ? webhooksError.message
                  : 'Impossible de récupérer les webhooks'}
              </p>
            ) : (webhooksData?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-5 text-sm text-gray-600 dark:text-slate-400">
                Aucun webhook n’est encore configuré. Utilisez le bouton « Gérer » pour en créer un.
              </div>
            ) : (
              <div className="space-y-3">
                {webhooksData?.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-start justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                          {webhook.description || 'Webhook sans titre'}
                        </h3>
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            webhook.is_active
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
                          )}
                        >
                          <span
                            className={clsx(
                              'block h-1.5 w-1.5 rounded-full',
                              webhook.is_active ? 'bg-emerald-500' : 'bg-gray-400',
                            )}
                          />
                          {webhook.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-400 font-mono break-words mb-2">
                        {webhook.url}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>
                          Événements : {webhook.events.length > 0 ? webhook.events.join(', ') : '—'}
                        </span>
                        <span>
                          Créé le{' '}
                          {new Date(webhook.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleWebhook(webhook)}
                        disabled={isWebhookMutating}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800 transition disabled:opacity-60"
                      >
                        {webhook.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/settings/webhooks?id=${webhook.id}`)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800 transition"
                      >
                        Ouvrir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'ai' && (
          <section className="space-y-6">
            <AIConfigSection />

            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="h-6 w-6 text-indigo-500" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                    Autofill – Statistiques d’usage
                  </h2>
                  <p className="text-sm text-gray-500">
                    Mesurez l’adoption et la qualité des suggestions générées.
                  </p>
                </div>
              </div>

              {isLoadingAutofillStats ? (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lecture des métriques…
                </div>
              ) : !autofillStats ? (
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Aucune donnée collectée pour le moment. Activez les logs et utilisez l’autofill
                  pour alimenter ces métriques.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                      label="Suggestions (14j)"
                      value={autofillStats.apply_rate.total_suggestions.toLocaleString('fr-FR')}
                      caption={`${autofillStats.apply_rate.total_applied.toLocaleString('fr-FR')} appliquées`}
                    />
                    <StatCard
                      label="Taux d’acceptation"
                      value={`${(autofillStats.apply_rate.rate * 100).toFixed(1)} %`}
                      caption="Suggestions acceptées / proposées"
                    />
                    <StatCard
                      label="Latence p95"
                      value={`${autofillStats.avg_latency_ms.p95} ms`}
                      caption={`Moyenne ${autofillStats.avg_latency_ms.value} ms`}
                    />
                  </div>

                  {topSourceMix.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Sources les plus utilisées
                      </h3>
                      <div className="grid gap-3 md:grid-cols-3">
                        {topSourceMix.map(([source, data]) => (
                          <div
                            key={source}
                            className="rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm"
                          >
                            <p className="font-semibold text-gray-900 dark:text-slate-100 uppercase">
                              {source.replace('_', ' ')}
                            </p>
                            <p className="text-gray-600 dark:text-slate-400">
                              {data.count} suggestions ({data.percentage.toFixed(1)} %)
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {autofillStats.pattern_confidence_by_domain.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Domaines les plus fiables
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {autofillStats.pattern_confidence_by_domain.slice(0, 4).map((item) => (
                          <div
                            key={item.domain}
                            className="rounded-lg border border-gray-100 bg-white dark:bg-slate-900 px-4 py-3 text-sm shadow-sm"
                          >
                            <p className="font-semibold text-gray-900 dark:text-slate-100">{item.domain}</p>
                            <p className="text-gray-600 dark:text-slate-400">
                              {item.samples} échantillons – confiance moyenne{' '}
                              {(item.avg_confidence * 100).toFixed(1)} %
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Timeline (7 derniers jours)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                        {timelinePreview.map((entry) => {
                          const applyRate = Math.min(100, Math.round(entry.apply_rate * 100))
                          const ignored = Math.max(entry.suggestions - entry.applied, 0)
                          return (
                            <li
                              key={entry.date}
                              className="rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-800 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-900 dark:text-slate-100">{entry.date}</span>
                                <span className="text-gray-900 dark:text-slate-100 font-medium">
                                  {entry.suggestions} sugg. · {applyRate} %
                                </span>
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{entry.applied} appliquées</span>
                                  <span>{ignored} ignorées</span>
                                </div>
                                <div className="mt-1 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                                    style={{ width: `${applyRate}%` }}
                                  />
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Top contributeurs (30 jours)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                        {leaderboardPreview.length === 0 ? (
                          <li className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 px-3 py-2">
                            Pas encore de leaderboard – commencez à utiliser l’autofill.
                          </li>
                        ) : (
                          leaderboardPreview.map((entry) => (
                            <li
                              key={entry.rank}
                              className="flex items-center justify-between rounded-lg border border-gray-100 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm"
                            >
                              <span>
                                #{entry.rank} – {entry.user_name}
                              </span>
                              <span className="text-gray-900 dark:text-slate-100 font-medium">
                                {(entry.apply_rate * 100).toFixed(0)} %
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'connectors' && (
          <section className="space-y-6">
            {/* Outlook Connector */}
            <OutlookConnector />

            {/* Autres connecteurs (à venir) */}
            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Link2 className="h-6 w-6 text-orange-500" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Autres connecteurs</h2>
                  <p className="text-sm text-gray-500">
                    Zapier, Make, Slack… Ces intégrations arrivent prochainement pour automatiser
                    vos workflows.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-6 text-sm text-gray-600 dark:text-slate-400">
                Nous finalisons l'API publique et les connecteurs (Zapier/Make). Laissez-nous un
                message si vous souhaitez participer à la bêta privée.
              </div>
            </div>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Journal de sécurité</h2>
            <p className="text-sm text-gray-500">
              Historique des modifications liées aux intégrations (bientôt disponible).
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-surface-secondary p-5 text-fluid-sm text-text-secondary">
          Le log d'audit détaillé (clés API, changements de webhooks, connexions externes) sera
          exposé ici une fois le module de traçabilité finalisé.
        </div>
      </section>
      </PageSection>
    </PageContainer>
  )
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="text-fluid-2xl font-semibold text-text-primary mt-1">{value}</p>
      {caption && <p className="text-xs text-text-secondary mt-1">{caption}</p>}
    </div>
  )
}
