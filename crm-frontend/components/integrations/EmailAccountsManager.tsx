'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'

type Provider = 'ionos' | 'gmail' | 'outlook' | 'exchange' | 'ovh' | 'generic'

interface EmailAccount {
  id: number
  email: string
  provider: Provider | string
  server: string | null
  is_active: boolean
  is_primary: boolean
  created_at: string
  team_id?: number
  user_id?: number | null
  protocol?: string | null
}

interface ProviderConfig {
  name: string
  icon: string
  color: string
  bgColor: string
  textColor: string
  type: 'imap' | 'oauth' | 'ews'
  defaultServer?: string
  defaultPort?: number
}

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  ionos: {
    name: 'IONOS',
    icon: '📧',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    type: 'imap',
    defaultServer: 'imap.ionos.fr',
    defaultPort: 993,
  },
  gmail: {
    name: 'Gmail',
    icon: '📨',
    color: 'from-red-500 to-pink-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    type: 'oauth',
    defaultServer: 'imap.gmail.com',
    defaultPort: 993,
  },
  outlook: {
    name: 'Outlook',
    icon: '📬',
    color: 'from-blue-600 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    type: 'oauth',
    defaultServer: 'outlook.office365.com',
    defaultPort: 993,
  },
  exchange: {
    name: 'Exchange',
    icon: '💼',
    color: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    type: 'ews',
  },
  ovh: {
    name: 'OVH',
    icon: '🔷',
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    type: 'imap',
    defaultServer: 'ssl0.ovh.net',
    defaultPort: 993,
  },
  generic: {
    name: 'Autre IMAP',
    icon: '⚙️',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    type: 'imap',
  },
}

const FALLBACK_PROVIDER_CONFIG: ProviderConfig = {
  name: 'Email',
  icon: '📧',
  color: 'from-gray-500 to-gray-600',
  bgColor: 'bg-gray-50',
  textColor: 'text-gray-700',
  type: 'imap',
}

const API_BASE = apiClient.getBaseUrl()
const EMAIL_ACCOUNTS_BASE = `${API_BASE}/integrations/email-accounts`
const EMAIL_ACCOUNTS_SYNC_BASE = `${API_BASE}/email-accounts`

function ensureAuthToken(): string {
  const token = apiClient.getToken()
  if (!token) {
    throw new Error('Session expirée – veuillez vous reconnecter.')
  }
  return token
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload) {
    return fallback
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload === 'object') {
    const detail = (payload as any).detail
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            const fieldPath = Array.isArray(item.loc)
              ? item.loc
                  .filter((part: unknown) => typeof part === 'string')
                  .join('.')
              : null
            const baseMessage = item.msg || item.message || item.detail
            if (fieldPath && baseMessage) {
              return `${fieldPath}: ${baseMessage}`
            }
            return baseMessage
          }
          return null
        })
        .filter(Boolean)
      if (messages.length > 0) {
        return messages.join(' · ')
      }
    } else if (detail) {
      return String(detail)
    }

    if ('message' in (payload as any) && (payload as any).message) {
      return String((payload as any).message)
    }
  }

  return fallback
}

function normalizeAccounts(data: unknown): EmailAccount[] {
  const coerce = (account: any): EmailAccount => {
    const provider = (account?.provider || account?.protocol || 'generic') as Provider | string
    return {
      id: Number(account?.id) || 0,
      email: String(account?.email || ''),
      provider,
      server: account?.server ?? null,
      is_active: account?.is_active ?? true,
      is_primary: account?.is_primary ?? false,
      created_at: account?.created_at || new Date().toISOString(),
      team_id: account?.team_id,
      user_id: account?.user_id,
      protocol: account?.protocol ?? null,
    }
  }

  if (Array.isArray(data)) {
    return data.map(coerce)
  }
  if (
    data &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as { items: unknown }).items)
  ) {
    return (data as { items: unknown[] }).items.map(coerce)
  }
  if (
    data &&
    typeof data === 'object' &&
    'accounts' in data &&
    Array.isArray((data as { accounts: unknown }).accounts)
  ) {
    return (data as { accounts: unknown[] }).accounts.map(coerce)
  }
  if (data && typeof data === 'object' && 'account' in data) {
    return [coerce((data as { account: unknown }).account)]
  }
  return []
}

export default function EmailAccountsManager() {
  const { showToast } = useToast()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    server: '',
    port: 993,
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = ensureAuthToken()

      const response = await fetch(EMAIL_ACCOUNTS_BASE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Erreur lors du chargement des comptes'))
      }

      const normalized = normalizeAccounts(payload)
      if (!Array.isArray(payload)) {
        console.warn('[EmailAccountsManager] Unexpected response shape', payload)
      }
      setAccounts(normalized)
    } catch (err: any) {
      setError(err.message)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const accountList = Array.isArray(accounts) ? accounts : []
  const currentProviderConfig = selectedProvider ? PROVIDER_CONFIG[selectedProvider] : null
  const requiresServer = currentProviderConfig
    ? ['imap', 'ews', 'oauth'].includes(currentProviderConfig.type)
    : false
  const requiresPort = currentProviderConfig ? currentProviderConfig.type === 'imap' || currentProviderConfig.type === 'oauth' : false
  const passwordLabel =
    currentProviderConfig?.type === 'oauth'
      ? 'Mot de passe d’application / token *'
      : 'Mot de passe *'
const passwordHelp =
  currentProviderConfig?.type === 'oauth'
    ? 'Utilisez un mot de passe d’application (Google/Microsoft) ou un token dédié. Il sera chiffré côté serveur.'
    : 'Le mot de passe sera chiffré (AES-256).'

function resolveProtocol(config: ProviderConfig | null): 'imap' | 'ews' {
  if (!config) return 'imap'
  if (config.type === 'ews') return 'ews'
  // Les providers OAuth actuels utilisent encore IMAP avec mot de passe d'application
  return 'imap'
}

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    const config = PROVIDER_CONFIG[provider]

    // Pre-fill server and port for IMAP providers
    if (config.defaultServer) {
      setFormData({
        email: '',
        password: '',
        server: config.defaultServer,
        port: config.defaultPort || 993,
      })
    } else {
      setFormData({
        email: '',
        password: '',
        server: '',
        port: 993,
      })
    }

    setShowModal(true)
  }

  const handleCreateAccount = async () => {
    if (!selectedProvider) return

    const config = PROVIDER_CONFIG[selectedProvider]

    // Validation
    if (!formData.email) {
      showToast({
        type: 'warning',
        title: 'Email requis',
        message: 'Veuillez saisir une adresse email',
      })
      return
    }

    if (!formData.password) {
      showToast({
        type: 'warning',
        title: 'Mot de passe requis',
        message:
          config.type === 'oauth'
            ? 'Veuillez saisir un mot de passe d’application ou un token OAuth.'
            : 'Veuillez saisir le mot de passe du compte email.',
      })
      return
    }

    if ((config.type === 'imap' || config.type === 'ews') && !formData.server) {
      showToast({
        type: 'warning',
        title: 'Champs requis',
        message:
          config.type === 'imap'
            ? 'Le serveur IMAP est obligatoire pour ce fournisseur.'
            : 'L’URL du serveur Exchange est obligatoire pour ce fournisseur.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const token = ensureAuthToken()

      const payload: any = {
        email: formData.email,
        provider: selectedProvider,
        password: formData.password,
        protocol: resolveProtocol(config),
      }

      if (config.type === 'imap') {
        const portSuffix = formData.port ? `:${formData.port}` : ':993'
        payload.server = formData.server.includes(':')
          ? formData.server
          : `${formData.server}${portSuffix}`
      } else if (config.type === 'ews') {
        if (formData.server) {
          payload.server = formData.server
        }
      }

      const response = await fetch(EMAIL_ACCOUNTS_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.json().catch(() => null)

      if (!response.ok) {
        console.warn('[EmailAccountsManager] Create account failed', {
          status: response.status,
          payload: responseBody,
        })
        throw new Error(extractErrorMessage(responseBody, 'Erreur lors de la création'))
      }

      const [createdAccount] = normalizeAccounts(responseBody)
      if (createdAccount) {
        setAccounts((prev) => [...prev, createdAccount])
      }
      setShowModal(false)
      setSelectedProvider(null)
      setFormData({ email: '', password: '', server: '', port: 993 })

      showToast({
        type: 'success',
        title: 'Compte ajouté',
        message: `${config.name} configuré avec succès`,
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (account: EmailAccount) => {
    try {
      const token = ensureAuthToken()

      const response = await fetch(`${EMAIL_ACCOUNTS_BASE}/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_active: !account.is_active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Erreur lors de la mise à jour')
      }

      const updated = await response.json()
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)))

      showToast({
        type: 'success',
        title: updated.is_active ? 'Compte activé' : 'Compte désactivé',
        message: account.email,
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err.message,
      })
    }
  }

  const handleDelete = async (account: EmailAccount) => {
    if (!confirm(`Supprimer le compte ${account.email} ?`)) return

    try {
      const token = ensureAuthToken()

      const response = await fetch(`${EMAIL_ACCOUNTS_BASE}/${account.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Erreur lors de la suppression')
      }

      setAccounts((prev) => prev.filter((a) => a.id !== account.id))

      showToast({
        type: 'success',
        title: 'Compte supprimé',
        message: account.email,
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err.message,
      })
    }
  }

  const handleTestConnection = async (account: EmailAccount) => {
    try {
      const token = ensureAuthToken()

      const response = await fetch(`${EMAIL_ACCOUNTS_BASE}/${account.id}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Test échoué')
      }

      const result = await response.json()

      showToast({
        type: 'success',
        title: 'Connexion réussie',
        message: result.message || 'Le serveur IMAP répond correctement',
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Connexion échouée',
        message: err.message,
      })
    }
  }

  const [isSyncing, setIsSyncing] = useState<number | null>(null)

  const handleSync = async (account: EmailAccount) => {
    setIsSyncing(account.id)
    try {
      const token = ensureAuthToken()

      const response = await fetch(`${EMAIL_ACCOUNTS_SYNC_BASE}/${account.id}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          since_days: 7,
          limit: 100,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Synchronisation échouée')
      }

      const result = await response.json()

      showToast({
        type: 'success',
        title: 'Synchronisation terminée',
        message: `${result.created} emails importés, ${result.skipped} ignorés`,
      })

      fetchAccounts()
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur de synchronisation',
        message: err.message,
      })
    } finally {
      setIsSyncing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des comptes email…
      </div>
    )
  }

  if (error && accountList.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Comptes email (Multi-Mail)</h3>
          <p className="text-sm text-gray-500">
            Connectez plusieurs boîtes mail IMAP pour la synchronisation
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedProvider(null)
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Ajouter un compte
        </button>
      </div>

      {/* Accounts List */}
      {accountList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Aucun compte configuré. Ajoutez votre premier compte email pour synchroniser vos mails.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accountList.map((account) => {
            const config = PROVIDER_CONFIG[account.provider as Provider] || FALLBACK_PROVIDER_CONFIG
            return (
              <div
                key={account.id}
                className="flex items-start justify-between p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className={clsx('p-2 rounded-lg', config.bgColor)}>
                    <span className="text-2xl">{config.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{account.email}</h4>
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                          account.is_active
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        <span
                          className={clsx(
                            'block h-1.5 w-1.5 rounded-full',
                            account.is_active ? 'bg-emerald-500' : 'bg-gray-400',
                          )}
                        />
                        {account.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      {account.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {config.name} {config.type === 'imap' && account.server && `· ${account.server}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ajouté le {new Date(account.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {config.type === 'imap' && (
                    <>
                      <button
                        onClick={() => handleTestConnection(account)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        Tester
                      </button>
                      <button
                        onClick={() => handleSync(account)}
                        disabled={isSyncing === account.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSyncing === account.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Sync...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Synchroniser
                          </>
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleToggleActive(account)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    {account.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleDelete(account)}
                    className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal for adding account */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedProvider ? `Ajouter ${PROVIDER_CONFIG[selectedProvider].name}` : 'Choisir un fournisseur'}
              </h3>
            </div>

            <div className="p-6">
              {!selectedProvider ? (
                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((provider) => {
                    const config = PROVIDER_CONFIG[provider]
                    return (
                      <button
                        key={provider}
                        onClick={() => handleProviderSelect(provider)}
                        className={clsx(
                          'p-6 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition text-left group',
                          config.bgColor,
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{config.icon}</span>
                          <h4 className={clsx('font-bold text-lg', config.textColor)}>{config.name}</h4>
                        </div>
                        <p className="text-xs text-gray-600">
                          {config.type === 'imap' && 'Connexion IMAP'}
                          {config.type === 'oauth' && 'OAuth (bientôt)'}
                          {config.type === 'ews' && 'Exchange Web Services'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleCreateAccount()
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@exemple.com"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {requiresServer && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {currentProviderConfig?.type === 'ews' ? 'URL du serveur Exchange *' : 'Serveur IMAP *'}
                      </label>
                      <input
                        type="text"
                        value={formData.server}
                        onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                        placeholder={currentProviderConfig?.type === 'ews' ? 'https://outlook.office365.com/EWS/Exchange.asmx' : 'imap.exemple.com'}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={requiresServer}
                      />
                    </div>
                  )}

                  {requiresPort && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input
                        type="number"
                        value={formData.port}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10)
                          setFormData({
                            ...formData,
                            port: Number.isFinite(parsed) ? parsed : 993,
                          })
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={requiresPort}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {passwordLabel}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={currentProviderConfig?.type === 'oauth' ? 'Mot de passe d’application / token' : '••••••••'}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{passwordHelp}</p>
                  </div>

                  {currentProviderConfig?.type === 'oauth' && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                      <p className="text-sm text-yellow-800">
                        OAuth pour {currentProviderConfig.name} arrive prochainement. En attendant, utilisez un mot de passe d'application.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setSelectedProvider(null)
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        'Ajouter'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
