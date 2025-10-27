'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plug,
  Mail,
  Webhook,
  Link2,
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function IntegrationsSettingsPage() {
  const { showToast } = useToast()

  // États pour les APIs Email
  const [resendApiKey, setResendApiKey] = useState('re_xxxxxxxxxxxxxxxxxxxxx')
  const [showResendKey, setShowResendKey] = useState(false)
  const [resendStatus, setResendStatus] = useState<'connected' | 'disconnected'>('connected')

  // États pour les Webhooks
  const [webhooks, setWebhooks] = useState([
    {
      id: '1',
      name: 'Lead créé',
      url: 'https://api.example.com/webhooks/lead-created',
      events: ['lead.created'],
      status: 'active' as const,
      lastTrigger: '2024-03-15 14:30',
    },
    {
      id: '2',
      name: 'Email envoyé',
      url: 'https://api.example.com/webhooks/email-sent',
      events: ['email.sent', 'email.delivered'],
      status: 'active' as const,
      lastTrigger: '2024-03-15 16:45',
    },
  ])

  // États pour les Connecteurs
  const [connectors] = useState([
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automatisez vos workflows avec 5000+ apps',
      icon: Zap,
      status: 'available' as const,
      color: 'orange',
    },
    {
      id: 'make',
      name: 'Make (Integromat)',
      description: 'Créez des scénarios d\'automatisation complexes',
      icon: Link2,
      status: 'available' as const,
      color: 'purple',
    },
  ])

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(resendApiKey)
    showToast({
      type: 'success',
      title: 'Clé API copiée',
      message: 'La clé a été copiée dans le presse-papiers',
    })
  }

  const handleTestResend = async () => {
    showToast({
      type: 'info',
      title: 'Test en cours...',
      message: 'Envoi d\'un email de test via Resend',
    })

    setTimeout(() => {
      showToast({
        type: 'success',
        title: 'Connexion réussie',
        message: 'L\'API Resend fonctionne correctement',
      })
    }, 1500)
  }

  const handleToggleWebhook = (id: string) => {
    setWebhooks((prev) =>
      prev.map((wh) =>
        wh.id === id
          ? { ...wh, status: wh.status === 'active' ? 'inactive' : 'active' }
          : wh
      )
    )
  }

  const handleConnectZapier = () => {
    showToast({
      type: 'info',
      title: 'Fonctionnalité à venir',
      message: 'La connexion Zapier sera disponible prochainement',
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux paramètres
        </Link>

        <h1 className="text-3xl font-bold text-gray-900">Intégrations</h1>
        <p className="text-gray-600 mt-2">
          Connectez votre CRM avec vos outils favoris
        </p>
      </div>

      {/* APIs Email */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              APIs Email
            </h2>
            <p className="text-sm text-gray-500">
              Configurez votre fournisseur d&apos;envoi d&apos;emails
            </p>
          </div>
        </div>

        {/* Resend API */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Resend</h3>
                <p className="text-xs text-gray-500">
                  Service d&apos;envoi d&apos;emails transactionnels
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                resendStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {resendStatus === 'connected' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connecté
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Déconnecté
                </>
              )}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clé API Resend
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showResendKey ? 'text' : 'password'}
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                  >
                    {showResendKey ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleCopyApiKey}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
                  title="Copier la clé"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleTestResend}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tester
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Obtenez votre clé API sur{' '}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  resend.com/api-keys
                </a>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Emails envoyés (30j)</p>
                <p className="text-lg font-bold text-gray-900">1,247</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Taux de livraison</p>
                <p className="text-lg font-bold text-emerald-600">98.5%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quota mensuel</p>
                <p className="text-lg font-bold text-gray-900">10,000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Autres providers (SendGrid, Mailgun) - placeholder */}
        <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
          <p className="text-sm text-gray-600 text-center">
            D&apos;autres fournisseurs (SendGrid, Mailgun, etc.) pourront être
            ajoutés ici
          </p>
        </div>
      </section>

      {/* Webhooks */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Webhook className="h-6 w-6 text-purple-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Webhooks</h2>
              <p className="text-sm text-gray-500">
                Recevez des notifications en temps réel
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              showToast({
                type: 'info',
                title: 'Fonctionnalité à venir',
                message: 'La création de webhooks sera disponible prochainement',
              })
            }
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
          >
            + Nouveau webhook
          </button>
        </div>

        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="flex items-start justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {webhook.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      webhook.status === 'active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        webhook.status === 'active'
                          ? 'bg-emerald-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    {webhook.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2 font-mono">
                  {webhook.url}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Événements: {webhook.events.map((e) => e).join(', ')}
                  </span>
                  <span>Dernier déclenchement: {webhook.lastTrigger}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleWebhook(webhook.id)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  {webhook.status === 'active' ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() =>
                    showToast({
                      type: 'info',
                      title: 'Fonctionnalité à venir',
                      message: 'L\'édition de webhooks sera disponible prochainement',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Éditer
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connecteurs externes */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Link2 className="h-6 w-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Connecteurs Externes
            </h2>
            <p className="text-sm text-gray-500">
              Automatisez vos workflows avec des plateformes tierces
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {connectors.map((connector) => {
            const Icon = connector.icon
            return (
              <div
                key={connector.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-5 hover:border-orange-200 hover:bg-orange-50/30 transition"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${connector.color}-500 to-${connector.color}-600 flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {connector.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {connector.description}
                    </p>
                    <button
                      onClick={handleConnectZapier}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Plug className="w-4 h-4" />
                      Connecter
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Journal de sécurité */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Journal de Sécurité
            </h2>
            <p className="text-sm text-gray-500">
              Historique des connexions et modifications API
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {[
            {
              date: '2024-03-15 14:30',
              action: 'Clé API Resend testée',
              status: 'success',
            },
            {
              date: '2024-03-14 09:15',
              action: 'Webhook "Lead créé" activé',
              status: 'info',
            },
            {
              date: '2024-03-13 16:45',
              action: 'Clé API Resend mise à jour',
              status: 'warning',
            },
            {
              date: '2024-03-12 11:20',
              action: 'Connexion Zapier établie',
              status: 'success',
            },
          ].map((log, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    log.status === 'success'
                      ? 'bg-emerald-500'
                      : log.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                  }`}
                />
                <span className="text-gray-900">{log.action}</span>
              </div>
              <span className="text-xs text-gray-500">{log.date}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
