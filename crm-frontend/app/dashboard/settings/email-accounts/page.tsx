'use client'

/**
 * Settings - Email Accounts (Multi-mail IONOS/Gmail/Outlook)
 * Design: Modern Apple-style avec glassmorphism
 */

import { useState, useEffect } from 'react'
import {
  Mail,
  Plus,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  Server,
  Lock,
  Zap,
  AlertCircle,
} from 'lucide-react'

type Provider = 'ionos' | 'gmail' | 'outlook' | 'exchange' | 'ovh' | 'generic'

interface EmailAccount {
  id: number
  email: string
  provider: Provider
  display_name?: string
  is_active: boolean
  is_primary: boolean
  server?: string
  last_sync?: string
  sync_status?: 'success' | 'error' | 'pending'
  error_message?: string
}

const PROVIDER_CONFIG = {
  ionos: {
    name: 'IONOS',
    icon: '📧',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    type: 'imap',
  },
  gmail: {
    name: 'Gmail',
    icon: '📨',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    type: 'oauth',
  },
  outlook: {
    name: 'Outlook',
    icon: '📬',
    color: 'from-sky-500 to-sky-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    type: 'oauth',
  },
  exchange: {
    name: 'Exchange',
    icon: '💼',
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    type: 'ews',
  },
  ovh: {
    name: 'OVH',
    icon: '🔷',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    type: 'imap',
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

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider>('ionos')

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    server: 'imap.ionos.fr',
    port: '993',
    display_name: '',
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/email-accounts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async () => {
    try {
      const res = await fetch('/api/v1/email-accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          provider: selectedProvider,
        }),
      })

      if (res.ok) {
        setShowAddModal(false)
        fetchAccounts()
        setFormData({ email: '', password: '', server: 'imap.ionos.fr', port: '993', display_name: '' })
      }
    } catch (error) {
      console.error('Failed to add account:', error)
    }
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await fetch(`/api/v1/email-accounts/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      })
      fetchAccounts()
    } catch (error) {
      console.error('Failed to toggle account:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce compte email ?')) return

    try {
      await fetch(`/api/v1/email-accounts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      fetchAccounts()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }

  const handleTestConnection = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/email-accounts/${id}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      const result = await res.json()
      alert(result.success ? '✅ Connexion réussie!' : `❌ Erreur: ${result.error}`)
    } catch (error) {
      console.error('Test failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Comptes Email
            </h1>
            <p className="text-slate-600">
              Connectez vos boîtes mail IONOS, Gmail ou Outlook pour synchroniser automatiquement vos emails
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un compte
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-3xl p-16 text-center shadow-2xl">
            <Mail className="w-20 h-20 text-slate-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Aucun compte configuré</h3>
            <p className="text-slate-600 mb-8">Ajoutez votre premier compte email pour commencer</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Ajouter un compte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account) => {
              const config = PROVIDER_CONFIG[account.provider]
              return (
                <div
                  key={account.id}
                  className="group backdrop-blur-xl bg-white/70 border border-white/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-2xl shadow-lg`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{account.display_name || account.email}</h3>
                          {account.is_primary && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs rounded-full font-semibold">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{account.email}</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 ${config.bgColor} ${config.textColor} rounded-full text-xs font-medium mt-1`}>
                          {config.name}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <button
                      onClick={() => handleToggleActive(account.id, account.is_active)}
                      className={`p-2 rounded-xl transition-all duration-300 ${
                        account.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={account.is_active ? 'Actif' : 'Inactif'}
                    >
                      {account.is_active ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Server Info */}
                  {account.server && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50/80 rounded-xl">
                      <Server className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700 font-mono">{account.server}</span>
                    </div>
                  )}

                  {/* Sync Status */}
                  {account.last_sync && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50/80 rounded-xl">
                      {account.sync_status === 'success' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-slate-700">
                            Dernière synchro: {new Date(account.last_sync).toLocaleString('fr-FR')}
                          </span>
                        </>
                      )}
                      {account.sync_status === 'error' && (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-700">{account.error_message || 'Erreur de synchronisation'}</span>
                        </>
                      )}
                      {account.sync_status === 'pending' && (
                        <>
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                          <span className="text-sm text-blue-700">Synchronisation en cours...</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-200/60">
                    <button
                      onClick={() => handleTestConnection(account.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 group"
                    >
                      <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Tester
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-300 hover:scale-110"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="backdrop-blur-xl bg-white/90 border border-white/50 rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-slideUp">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Ajouter un compte email</h2>

            {/* Provider Selection */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {(['ionos', 'gmail', 'outlook', 'exchange', 'ovh', 'generic'] as const).map((provider) => {
                const config = PROVIDER_CONFIG[provider]
                const isSelected = selectedProvider === provider
                return (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                      isSelected
                        ? `bg-gradient-to-br ${config.color} text-white border-transparent shadow-xl scale-105`
                        : 'bg-white/50 border-slate-200 hover:border-slate-300 hover:bg-white/80'
                    }`}
                  >
                    <div className="text-4xl mb-2">{config.icon}</div>
                    <div className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{config.name}</div>
                  </button>
                )
              })}
            </div>

            {/* Form */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@alforis.fr"
                  className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {(selectedProvider === 'ionos' || selectedProvider === 'ovh' || selectedProvider === 'exchange' || selectedProvider === 'generic') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Serveur IMAP</label>
                    <input
                      type="text"
                      value={formData.server}
                      onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                      placeholder="imap.ionos.fr"
                      className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Port</label>
                    <input
                      type="text"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      placeholder="993"
                      className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nom d'affichage (optionnel)</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Contact Alforis"
                  className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Alert */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-8">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                <strong>Sécurité:</strong> Votre mot de passe sera chiffré avec AES-256 avant d'être stocké.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleAddAccount}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
