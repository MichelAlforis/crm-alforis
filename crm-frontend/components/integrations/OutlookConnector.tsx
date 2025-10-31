'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Mail, RefreshCw, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import OutlookConsentModal from './OutlookConsentModal'
import { storage } from '@/lib/constants'

interface MicrosoftAccount {
  email: string
  display_name: string
  user_principal_name: string
  job_title?: string
  office_location?: string
}

export default function OutlookConnector() {
  const { showToast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [microsoftAccount, setMicrosoftAccount] = useState<MicrosoftAccount | null>(null)
  const [lastSyncStats, setLastSyncStats] = useState<{
    messages_count: number
    signatures_count: number
  } | null>(null)
  const [lastSignatures, setLastSignatures] = useState<any[]>([])
  const [showConsentModal, setShowConsentModal] = useState(false)

  useEffect(() => {
    checkOutlookStatus()
  }, [])

  const checkOutlookStatus = async () => {
    setIsLoading(true)
    try {
      // Récupérer le profil user pour vérifier outlook_connected
      const data = await apiClient.getCurrentUser()

      if (data && data.outlook_integration) {
        setIsConnected(data.outlook_integration.outlook_connected || false)
        setExpiresAt(data.outlook_integration.outlook_token_expires_at || null)

        // Si connecté, récupérer les infos du compte Microsoft
        if (data.outlook_integration.outlook_connected) {
          await fetchMicrosoftAccount()
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut Outlook:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMicrosoftAccount = async () => {
    try {
      const result = await apiClient.outlookGetProfile()
      if (result && result.microsoft_account) {
        setMicrosoftAccount(result.microsoft_account)
      }
    } catch (error) {
      // Ignorer l'erreur si le token a expiré - l'utilisateur devra se reconnecter
      console.warn('Impossible de récupérer le profil Microsoft (token expiré?)', error)
      setMicrosoftAccount(null)
    }
  }

  const handleConnectClick = () => {
    // Ouvrir le modal de consentement RGPD d'abord
    setShowConsentModal(true)
  }

  const handleConsentConfirmed = async () => {
    setShowConsentModal(false)

    try {
      // Étape 1: Obtenir l'URL d'autorisation
      const { authorization_url, state } = await apiClient.outlookAuthorize()

      // Stocker le state pour la validation du callback
      storage.set('outlook_oauth_state', state)

      // Étape 2: Ouvrir popup OAuth
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        authorization_url,
        'Outlook OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!popup) {
        showToast({
          type: 'error',
          title: 'Popup bloquée',
          message: 'Autorisez les popups pour connecter Outlook'
        })
        return
      }

      // Étape 3: Écouter le message du callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'outlook_callback') {
          window.removeEventListener('message', handleMessage)

          const { code, state: returnedState } = event.data

          // Vérifier le state CSRF
          const storedState = storage.get('outlook_oauth_state')
          if (returnedState !== storedState) {
            showToast({
              type: 'error',
              title: 'Erreur de sécurité',
              message: 'State CSRF invalide'
            })
            return
          }

          try {
            // Étape 4: Échanger le code contre un token
            const result = await apiClient.outlookCallback(code, returnedState)

            // Récupérer immédiatement le profil Microsoft
            await fetchMicrosoftAccount()

            showToast({
              type: 'success',
              title: 'Outlook connecté',
              message: result.message
            })

            setIsConnected(true)
            checkOutlookStatus()
          } catch (error: any) {
            showToast({
              type: 'error',
              title: 'Échec de la connexion',
              message: error?.message || 'Impossible de connecter Outlook'
            })
          } finally {
            storage.remove('outlook_oauth_state')
          }
        }
      }

      window.addEventListener('message', handleMessage)

      // Timeout après 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage)
        storage.remove('outlook_oauth_state')
      }, 5 * 60 * 1000)

    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.message || 'Impossible de démarrer l\'authentification'
      })
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await apiClient.outlookSync(50)

      setLastSyncStats({
        messages_count: result.messages_count,
        signatures_count: result.signatures_count
      })
      setLastSignatures(result.signatures || [])

      showToast({
        type: 'success',
        title: 'Synchronisation terminée',
        message: `${result.signatures_count} signatures extraites de ${result.messages_count} emails`
      })
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Échec de la synchronisation',
        message: error?.message || 'Impossible de synchroniser les emails'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter Outlook ?\n\nCela révoquera l\'accès mais conservera les données collectées.')) return

    try {
      await apiClient.outlookDisconnect()

      showToast({
        type: 'success',
        title: 'Outlook déconnecté',
        message: 'L\'accès a été révoqué avec succès'
      })

      setIsConnected(false)
      setExpiresAt(null)
      setMicrosoftAccount(null)
      setLastSyncStats(null)
      setLastSignatures([])
      checkOutlookStatus()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.message || 'Impossible de déconnecter Outlook'
      })
    }
  }

  const handleDeleteData = async () => {
    const confirmed = confirm(
      '⚠️ ATTENTION - Suppression RGPD\n\n' +
      'Cette action va supprimer DÉFINITIVEMENT:\n' +
      '- Vos tokens OAuth Outlook\n' +
      '- Toutes les signatures collectées\n' +
      '- Tous les logs d\'autofill source Outlook\n' +
      '- Votre consentement RGPD\n\n' +
      'Cette action est IRRÉVERSIBLE.\n\n' +
      'Confirmez-vous la suppression complète ?'
    )

    if (!confirmed) return

    try {
      const result = await apiClient.outlookDeleteData()

      showToast({
        type: 'success',
        title: 'Données supprimées',
        message: `${result.deleted_logs} logs et ${result.deleted_decisions} décisions supprimés`
      })

      setIsConnected(false)
      setExpiresAt(null)
      setMicrosoftAccount(null)
      setLastSyncStats(null)
      checkOutlookStatus()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.message || 'Impossible de supprimer les données'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du statut Outlook...
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="h-6 w-6 text-blue-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Microsoft Outlook</h2>
          <p className="text-sm text-gray-500">
            Extrayez les signatures d'emails pour enrichir vos contacts automatiquement
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Statut</p>
            <p className="text-lg font-semibold text-gray-900">
              {isConnected ? 'Connecté' : 'Non configuré'}
            </p>
            {microsoftAccount && isConnected && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-medium">📧</span>
                  <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
                    {microsoftAccount.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-medium">👤</span>
                  <span>{microsoftAccount.display_name}</span>
                </div>
                {microsoftAccount.job_title && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">💼</span>
                    <span>{microsoftAccount.job_title}</span>
                  </div>
                )}
                {microsoftAccount.office_location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">🏢</span>
                    <span>{microsoftAccount.office_location}</span>
                  </div>
                )}
              </div>
            )}
            {expiresAt && isConnected && !microsoftAccount && (
              <p className="text-sm text-gray-600">
                Expire le : {new Date(expiresAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <span
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
              isConnected
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Actif
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                Inactif
              </>
            )}
          </span>
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">Pourquoi connecter Outlook ?</p>
              <ul className="space-y-1 text-xs text-blue-800">
                <li>✓ Extraction automatique des signatures d'emails</li>
                <li>✓ Enrichissement des contacts (email, téléphone, fonction, entreprise)</li>
                <li>✓ Détection des threads sans réponse</li>
                <li>✓ Autofill intelligent avec données réelles</li>
              </ul>
            </div>

            <button
              onClick={handleConnectClick}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <Mail className="h-4 w-4" />
              Connecter mon compte Outlook
            </button>

            <p className="text-xs text-gray-500 text-center">
              Permissions requises : Mail.Read, Contacts.Read
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {lastSyncStats && (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-100 bg-white p-4 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">Dernière synchronisation</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>
                      <p className="text-gray-500">Emails analysés</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {lastSyncStats.messages_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Signatures extraites</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {lastSyncStats.signatures_count}
                      </p>
                    </div>
                  </div>
                </div>

                {lastSignatures.length > 0 && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-3">
                      📬 Signatures extraites ({lastSignatures.length})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {lastSignatures.map((sig, idx) => (
                        <div
                          key={idx}
                          className="rounded-md border border-blue-200 bg-white p-3 text-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              {sig.email && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">📧</span>
                                  <span className="font-mono text-blue-700">{sig.email}</span>
                                </div>
                              )}
                              {sig.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">📞</span>
                                  <span className="font-mono text-gray-700">{sig.phone}</span>
                                </div>
                              )}
                              {sig.job_title && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">💼</span>
                                  <span className="text-gray-700">{sig.job_title}</span>
                                </div>
                              )}
                              {sig.company && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">🏢</span>
                                  <span className="text-gray-700">{sig.company}</span>
                                </div>
                              )}
                            </div>
                            {sig.source_date && (
                              <span className="text-gray-400 text-[10px] whitespace-nowrap">
                                {new Date(sig.source_date).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </button>
              <button
                onClick={handleDisconnect}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <XCircle className="h-4 w-4" />
                Déconnecter
              </button>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
              <p className="font-semibold mb-1">💡 Astuce</p>
              <p className="text-indigo-800">
                Les signatures extraites sont utilisées automatiquement par l'Autofill V2 pour
                suggérer email, téléphone, fonction et entreprise lors de la création de contacts.
              </p>
            </div>

            {/* RGPD - Droit à l'effacement */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-900 mb-2">
                🔒 RGPD - Droit à l'effacement (Article 17)
              </p>
              <p className="text-xs text-amber-800 mb-3">
                Vous pouvez demander la suppression complète de toutes les données collectées depuis Outlook.
                Cette action est irréversible.
              </p>
              <button
                onClick={handleDeleteData}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
              >
                <XCircle className="h-3.5 w-3.5" />
                Supprimer toutes mes données Outlook
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de consentement RGPD */}
      <OutlookConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConsentConfirmed}
      />
    </div>
  )
}
