'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mail,
  Plus,
  Check,
  X,
  Send,
  Trash2,
  Edit,
  Power,
  PowerOff,
  ArrowLeft,
  Key,
} from 'lucide-react'
import { useEmailConfig, EmailConfiguration, EmailProvider } from '@/hooks/useEmailConfig'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/hooks/useConfirm'
import { Card, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'

const PROVIDER_OPTIONS = [
  { value: 'resend', label: 'Resend (Recommandé)' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
]

const PROVIDER_INFO: Record<EmailProvider, { name: string; docUrl: string; color: string }> = {
  resend: {
    name: 'Resend',
    docUrl: 'https://resend.com/docs',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  sendgrid: {
    name: 'SendGrid',
    docUrl: 'https://sendgrid.com/docs/api-reference/',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  mailgun: {
    name: 'Mailgun',
    docUrl: 'https://documentation.mailgun.com/',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
}

export default function EmailApisSettingsPage() {
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<EmailConfiguration | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const emailConfig = useEmailConfig()
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()

  useEffect(() => {
    loadConfigurations()
  }, [])

  const loadConfigurations = async () => {
    try {
      const configs = await emailConfig.listConfigurations()
      setConfigurations(configs)
    } catch (error) {
      logger.error('Failed to load configurations:', error)
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await emailConfig.activateConfiguration(id)
      showToast({ type: 'success', title: 'Configuration activée' })
      loadConfigurations()
    } catch (error: any) {
      showToast({ type: 'error', title: error.message })
    }
  }

  const handleDeactivate = async (id: number) => {
    try {
      await emailConfig.deactivateConfiguration(id)
      showToast({ type: 'success', title: 'Configuration désactivée' })
      loadConfigurations()
    } catch (error: any) {
      showToast({ type: 'error', title: error.message })
    }
  }

  const handleDelete = (id: number, name: string) => {
    confirm({
      title: 'Supprimer la configuration',
      message: `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
      confirmText: 'Supprimer',
      type: 'danger',
      onConfirm: async () => {
        try {
          await emailConfig.deleteConfiguration(id)
          showToast({ type: 'success', title: 'Configuration supprimée' })
          loadConfigurations()
        } catch (error: any) {
          showToast({ type: 'error', title: error.message })
        }
      },
    })
  }

  const handleEdit = (config: EmailConfiguration) => {
    setSelectedConfig(config)
    setShowEditModal(true)
  }

  const handleTest = (config: EmailConfiguration) => {
    setSelectedConfig(config)
    setShowTestModal(true)
  }

  const handleTestSubmit = async () => {
    if (!selectedConfig || !testEmail) return

    try {
      const result = await emailConfig.testConfiguration(selectedConfig.id, testEmail)
      if (result.success) {
        showToast({ type: 'success', title: 'Email de test envoyé', message: `Vérifiez ${testEmail}` })
      } else {
        showToast({ type: 'error', title: 'Échec du test', message: result.error })
      }
      setShowTestModal(false)
      setTestEmail('')
      loadConfigurations()
    } catch (error: any) {
      showToast({ type: 'error', title: error.message })
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Mail className="w-8 h-8 text-bleu" />
              APIs Email
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Gérez vos clés API pour l'envoi de campagnes email
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouvelle configuration
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
        <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 text-sm">Clés API cryptées</h3>
          <p className="text-xs text-blue-700 mt-1">
            Vos clés API sont cryptées avant d'être stockées en base de données. Une seule
            configuration peut être active à la fois. Plus besoin du fichier .env !
          </p>
        </div>
      </div>

      {/* Liste des configurations */}
      <div className="space-y-4">
        {configurations.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                Aucune configuration
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                Ajoutez votre première configuration email pour commencer à envoyer des campagnes
              </p>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer une configuration
              </Button>
            </CardBody>
          </Card>
        ) : (
          configurations.map((config) => (
            <Card key={config.id} className={config.is_active ? 'ring-2 ring-bleu' : ''}>
              <CardBody className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{config.name}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          PROVIDER_INFO[config.provider].color
                        }`}
                      >
                        {PROVIDER_INFO[config.provider].name}
                      </span>
                      {config.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{config.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {config.from_email && (
                        <div>
                          <span className="text-gray-500">Email expéditeur:</span>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{config.from_email}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Limite/min:</span>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{config.rate_limit_per_minute}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Taille lots:</span>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{config.batch_size}</p>
                      </div>
                      {config.last_tested_at && (
                        <div>
                          <span className="text-gray-500">Dernier test:</span>
                          <div className="flex items-center gap-1">
                            {config.test_status === 'success' ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <X className="w-3 h-3 text-red-600" />
                            )}
                            <p className="font-medium text-gray-900 dark:text-slate-100">
                              {new Date(config.last_tested_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(config)}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Tester
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                      leftIcon={<Edit className="w-4 h-4" />}
                    >
                      Modifier
                    </Button>
                    {config.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(config.id)}
                        leftIcon={<PowerOff className="w-4 h-4" />}
                      >
                        Désactiver
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleActivate(config.id)}
                        leftIcon={<Power className="w-4 h-4" />}
                      >
                        Activer
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id, config.name)}
                      leftIcon={<Trash2 className="w-4 h-4 text-red-600" />}
                      disabled={config.is_active}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />

      {/* Modal Create */}
      {showCreateModal && (
        <CreateConfigModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadConfigurations()
          }}
        />
      )}

      {/* Modal Edit */}
      {showEditModal && selectedConfig && (
        <EditConfigModal
          config={selectedConfig}
          onClose={() => {
            setShowEditModal(false)
            setSelectedConfig(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedConfig(null)
            loadConfigurations()
          }}
        />
      )}

      {/* Modal Test */}
      {showTestModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Tester "{selectedConfig.name}"
              </h3>
              <p className="text-sm text-text-secondary">
                Entrez votre email pour recevoir un email de test
              </p>
              <Input
                label="Email de test"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowTestModal(false)
                    setTestEmail('')
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTestSubmit}
                  isLoading={emailConfig.isLoading}
                  leftIcon={<Send className="w-4 h-4" />}
                  disabled={!testEmail}
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// Modal de création
function CreateConfigModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'resend' as EmailProvider,
    api_key: '',
    mailgun_domain: '',
    from_name: 'Alforis CRM',
    from_email: '',
    reply_to: '',
    rate_limit_per_minute: 120,
    batch_size: 500,
    track_opens: true,
    track_clicks: true,
    is_active: false,
  })

  const emailConfig = useEmailConfig()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await emailConfig.createConfiguration(formData)
      showToast({ type: 'success', title: 'Configuration créée' })
      onSuccess()
    } catch (error: any) {
      showToast({ type: 'error', title: error.message })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full my-8">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <h3 className="text-xl font-semibold text-text-primary">Nouvelle configuration email</h3>

            <div className="space-y-4">
              <Input
                label="Nom *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Production Resend"
                required
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              <Select
                label="Fournisseur *"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as EmailProvider })}
                options={PROVIDER_OPTIONS}
              />

              <Input
                label="Clé API *"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Votre clé API (sera cryptée)"
                required
              />

              {formData.provider === 'mailgun' && (
                <Input
                  label="Domaine Mailgun *"
                  value={formData.mailgun_domain}
                  onChange={(e) => setFormData({ ...formData, mailgun_domain: e.target.value })}
                  placeholder="Ex: mg.example.com"
                  required
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nom expéditeur"
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                />
                <Input
                  label="Email expéditeur"
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                  placeholder="noreply@example.com"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 dark:border-slate-600 rounded focus:ring-primary"
                />
                <span className="text-sm text-text-primary">Activer cette configuration immédiatement</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" type="button" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={emailConfig.isLoading}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}

// Modal d'édition
function EditConfigModal({
  config,
  onClose,
  onSuccess,
}: {
  config: EmailConfiguration
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: config.name,
    description: config.description || '',
    api_key: '', // Vide par défaut, rempli uniquement si l'utilisateur veut changer
    mailgun_domain: '',
    from_name: config.from_name || '',
    from_email: config.from_email || '',
    reply_to: config.reply_to || '',
    rate_limit_per_minute: config.rate_limit_per_minute,
    batch_size: config.batch_size,
    track_opens: config.track_opens,
    track_clicks: config.track_clicks,
  })

  const emailConfig = useEmailConfig()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Ne pas envoyer api_key si vide (pas de changement)
      const updateData: any = { ...formData }
      if (!updateData.api_key) {
        delete updateData.api_key
      }
      if (!updateData.mailgun_domain) {
        delete updateData.mailgun_domain
      }

      await emailConfig.updateConfiguration(config.id, updateData)
      showToast({ type: 'success', title: 'Configuration modifiée' })
      onSuccess()
    } catch (error: any) {
      showToast({ type: 'error', title: error.message })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full my-8">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-text-primary">Modifier la configuration</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Provider: <span className="font-medium">{PROVIDER_INFO[config.provider].name}</span>
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nom *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Production Resend"
                required
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              <Input
                label="Clé API (laisser vide pour ne pas modifier)"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Nouvelle clé API (sera cryptée)"
              />

              {config.provider === 'mailgun' && (
                <Input
                  label="Domaine Mailgun (laisser vide pour ne pas modifier)"
                  value={formData.mailgun_domain}
                  onChange={(e) => setFormData({ ...formData, mailgun_domain: e.target.value })}
                  placeholder="Ex: mg.example.com"
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nom expéditeur"
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                />
                <Input
                  label="Email expéditeur"
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                  placeholder="noreply@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Limite d'envoi/min"
                  type="number"
                  value={formData.rate_limit_per_minute}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) || 120 })
                  }
                />
                <Input
                  label="Taille des lots"
                  type="number"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || 500 })}
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.track_opens}
                    onChange={(e) => setFormData({ ...formData, track_opens: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 dark:border-slate-600 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">Tracker les ouvertures</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.track_clicks}
                    onChange={(e) => setFormData({ ...formData, track_clicks: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 dark:border-slate-600 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">Tracker les clics</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" type="button" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={emailConfig.isLoading}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}
