'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  ShieldCheck,
  Link as LinkIcon,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  Alert,
  Modal,
  Input,
} from '@/components/shared'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/hooks/useConfirm'
import { useModalForm } from '@/hooks/useModalForm'
import { useClipboard } from '@/hooks/useClipboard'
import {
  useWebhooks,
  useWebhookEvents,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useRotateWebhookSecret,
} from '@/hooks/useWebhooks'
import type { Webhook } from '@/lib/types'

type ModalMode = 'create' | 'edit'

interface WebhookFormState {
  url: string
  events: string[]
  description: string
  is_active: boolean
  secret: string
}

const INITIAL_FORM: WebhookFormState = {
  url: '',
  events: [],
  description: '',
  is_active: true,
  secret: '',
}

function maskSecret(secret: string): string {
  if (!secret) return ''
  if (secret.length <= 8) return secret
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`
}

export default function WebhookSettingsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const { data: webhooks, isLoading, error } = useWebhooks()
  const { data: events, isLoading: eventsLoading } = useWebhookEvents()
  const createWebhook = useCreateWebhook()
  const updateWebhook = useUpdateWebhook()
  const deleteWebhook = useDeleteWebhook()
  const rotateWebhookSecret = useRotateWebhookSecret()

  const { copy: copyToClipboard } = useClipboard({
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Secret copié',
        message: 'Le secret HMAC est dans le presse-papier.',
      })
    },
    onError: () => {
      showToast({
        type: 'warning',
        title: 'Copie indisponible',
        message: 'Votre navigateur ne supporte pas la copie automatique.',
      })
    },
  })

  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [actionWebhookId, setActionWebhookId] = useState<number | null>(null)

  // Use the new useModalForm hook
  const modal = useModalForm<WebhookFormState>({
    initialValues: INITIAL_FORM,
    validate: (values) => {
      const errors: Partial<Record<keyof WebhookFormState, string>> = {}
      if (!values.url.trim()) {
        errors.url = 'L\'URL du webhook est obligatoire.'
      }
      if (values.events.length === 0) {
        errors.events = 'Sélectionnez au moins un événement.'
      }
      return errors
    },
    onSubmit: async (values) => {
      const payload = {
        url: values.url.trim(),
        events: values.events,
        description: values.description.trim() || undefined,
        is_active: values.is_active,
        secret: values.secret.trim() || undefined,
      }

      if (modalMode === 'create') {
        await createWebhook.mutateAsync(payload)
        showToast({
          type: 'success',
          title: 'Webhook créé',
          message: 'Le webhook a été créé et est prêt à recevoir des évènements.',
        })
      } else if (editingWebhook) {
        const { secret, ...rest } = payload
        await updateWebhook.mutateAsync({
          id: editingWebhook.id,
          data: secret ? payload : rest,
        })
        showToast({
          type: 'success',
          title: 'Webhook mis à jour',
          message: 'Les modifications ont été enregistrées.',
        })
      }
    },
  })

  const eventLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    events?.forEach((evt) => map.set(evt.value, evt.label))
    return map
  }, [events])

  const openCreateModal = () => {
    modal.reset()
    setModalMode('create')
    setEditingWebhook(null)
    modal.open()
  }

  const openEditModal = (webhook: Webhook) => {
    modal.setValues({
      url: webhook.url,
      events: webhook.events,
      description: webhook.description || '',
      is_active: webhook.is_active,
      secret: '',
    })
    setEditingWebhook(webhook)
    setModalMode('edit')
    modal.open()
  }

  const toggleEvent = (eventValue: string) => {
    const currentEvents = modal.values.events
    const exists = currentEvents.includes(eventValue)
    modal.setFieldValue(
      'events',
      exists ? currentEvents.filter((evt) => evt !== eventValue) : [...currentEvents, eventValue]
    )
  }

  const handleDelete = async (webhook: Webhook) => {
    await confirm({
      title: 'Supprimer le webhook ?',
      message: `Voulez-vous vraiment supprimer le webhook ${webhook.url} ? Cette action est irréversible.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          setActionWebhookId(webhook.id)
          await deleteWebhook.mutateAsync(webhook.id)
          showToast({
            type: 'success',
            title: 'Webhook supprimé',
            message: 'Le webhook a été retiré de la configuration.',
          })
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: err?.detail || 'Suppression impossible. Réessayez plus tard.',
          })
        } finally {
          setActionWebhookId(null)
        }
      },
    })
  }

  const handleRotateSecret = async (webhook: Webhook) => {
    try {
      setActionWebhookId(webhook.id)
      const updated = await rotateWebhookSecret.mutateAsync({ id: webhook.id })
      showToast({
        type: 'info',
        title: 'Secret régénéré',
        message: 'Le nouveau secret a été copié dans le presse-papier.',
      })
      await copyToClipboard(updated.secret)
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Rotation impossible',
        message: err?.detail || 'La rotation du secret a échoué.',
      })
    } finally {
      setActionWebhookId(null)
    }
  }

  const handleCopySecret = async (secret: string) => {
    await copyToClipboard(secret)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-bleu hover:underline">
          <LinkIcon className="w-4 h-4 mr-1" />
          Retour aux paramètres
        </Link>
        <h1 className="text-3xl font-bold text-ardoise">Webhooks & Integrations</h1>
        <p className="text-gray-600 max-w-2xl">
          Automatisez vos intégrations externes en recevant des notifications HTTP lorsqu’un évènement clé se produit dans le CRM.
        </p>
      </div>

      {error && (
        <Alert
          type="error"
          message="Impossible de charger les webhooks pour le moment. Veuillez réessayer plus tard."
        />
      )}

      <Card>
        <CardHeader
          title="Webhooks configurés"
          subtitle="Chaque webhook recevra un payload JSON signé (HMAC SHA-256) lors des évènements sélectionnés."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
              Nouveau webhook
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <Table
            data={webhooks || []}
            isLoading={isLoading}
            isEmpty={!isLoading && (webhooks?.length || 0) === 0}
            emptyMessage="Aucun webhook configuré pour le moment."
            columns={[
              {
                header: 'URL',
                accessor: 'url',
                render: (value: string) => (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="text-bleu hover:underline break-all">
                    {value}
                  </a>
                ),
              },
              {
                header: 'Évènements',
                accessor: (row: Webhook) => row.events,
                render: (_: unknown, row: Webhook) => (
                  <div className="flex flex-wrap gap-1">
                    {row.events.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs"
                      >
                        {eventLabelMap.get(event) || event}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                header: 'Statut',
                accessor: 'is_active',
                render: (value: boolean) => (
                  <span
                    className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                      value
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {value ? 'Actif' : 'Désactivé'}
                  </span>
                ),
              },
              {
                header: 'Secret',
                accessor: 'secret',
                render: (value: string) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">{maskSecret(value)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopySecret(value)}
                      aria-label="Copier le secret"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ),
              },
              {
                header: 'Actions',
                accessor: 'id',
                render: (_: number, row: Webhook) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(row)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRotateSecret(row)}
                      isLoading={rotateWebhookSecret.isPending && actionWebhookId === row.id}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(row)}
                      isLoading={deleteWebhook.isPending && actionWebhookId === row.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modalMode === 'create' ? 'Ajouter un webhook' : 'Modifier le webhook'}
        footer={
          <>
            <Button variant="ghost" onClick={modal.close}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                const form = document.getElementById('webhook-form') as HTMLFormElement | null
                form?.requestSubmit()
              }}
              isLoading={modal.isSubmitting}
            >
              {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <form id="webhook-form" onSubmit={modal.handleSubmit} className="space-y-4">
          {modal.error && (
            <Alert
              type="error"
              message={modal.error}
              onClose={modal.clearError}
            />
          )}

          <Input
            label="URL du webhook"
            type="url"
            placeholder="https://votre-app.com/webhook"
            required
            value={modal.values.url}
            onChange={modal.handleChange('url')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Évènements surveillés
            </label>
            {eventsLoading ? (
              <p className="text-sm text-gray-500">Chargement des événements...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(events || []).map((evt) => {
                  const checked = modal.values.events.includes(evt.value)
                  return (
                    <label
                      key={evt.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        checked ? 'border-bleu bg-blue-50' : 'border-gray-200 hover:border-bleu'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleEvent(evt.value)}
                      />
                      <div>
                        <p className="font-medium text-sm text-ardoise">{evt.label}</p>
                        <p className="text-xs text-gray-500">{evt.value}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="flex items-center gap-2">
      <input
        id="webhook-active"
        type="checkbox"
        className="h-4 w-4 text-bleu border-gray-300 rounded"
        checked={modal.values.is_active}
        onChange={modal.handleChange('is_active')}
      />
      <label htmlFor="webhook-active" className="text-sm text-gray-700">
        Activer immédiatement
      </label>
    </div>
    <div>
      <Input
        label="Secret personnalisé (optionnel)"
        placeholder="Laisser vide pour générer automatiquement"
        value={modal.values.secret}
        onChange={modal.handleChange('secret')}
      />
    </div>
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Description (optionnel)
    </label>
    <textarea
      value={modal.values.description}
      onChange={modal.handleChange('description')}
      rows={3}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
      placeholder="Ex: Synchronisation avec l'outil marketing"
    />
  </div>
</form>
      </Modal>
    </div>
  )
}
