'use client'
import { logger } from '@/lib/logger'

import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, List, Users, Calendar } from 'lucide-react'
import { Card, CardHeader, CardBody, Button } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Modal } from '@/components/shared/Modal'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/hooks/useConfirm'

interface MailingList {
  id: number
  name: string
  description?: string
  target_type: string
  filters: any
  recipient_count: number
  is_active: boolean
  last_used_at?: string
  created_at: string
}

export default function MailingListsPage() {
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const [lists, setLists] = useState<MailingList[]>([])
  const [_isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingList, setEditingList] = useState<MailingList | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_type: 'contacts',
  })

  const loadLists = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<{ items: MailingList[] }>('/mailing-lists')
      setLists(response.data.items || [])
    } catch (error) {
      logger.error('Failed to load lists:', error)
      showToast({ type: 'error', title: 'Impossible de charger les listes' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  const handleCreate = () => {
    setEditingList(null)
    setFormData({ name: '', description: '', target_type: 'contacts' })
    setIsModalOpen(true)
  }

  const handleEdit = (list: MailingList) => {
    setEditingList(list)
    setFormData({
      name: list.name,
      description: list.description || '',
      target_type: list.target_type,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast({ type: 'error', title: 'Veuillez renseigner un nom' })
      return
    }

    try {
      if (editingList) {
        await apiClient.put(`/mailing-lists/${editingList.id}`, formData)
        showToast({ type: 'success', title: 'Liste mise à jour' })
      } else {
        await apiClient.post('/mailing-lists', {
          ...formData,
          filters: {},
          recipient_count: 0,
        })
        showToast({ type: 'success', title: 'Liste créée avec succès' })
      }
      setIsModalOpen(false)
      loadLists()
    } catch (error) {
      logger.error('Failed to save list:', error)
      showToast({ type: 'error', title: 'Erreur lors de la sauvegarde' })
    }
  }

  const handleDelete = async (id: number) => {
    confirm({
      title: 'Supprimer la liste',
      message: 'Voulez-vous vraiment supprimer cette liste de diffusion ? Cette action est irréversible.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/mailing-lists/${id}`)
          showToast({ type: 'success', title: 'Liste supprimée' })
          loadLists()
        } catch (error) {
          logger.error('Failed to delete list:', error)
          showToast({ type: 'error', title: 'Erreur lors de la suppression' })
        }
      },
    })
  }

  const columns: ColumnV2<MailingList>[] = [
    {
      header: 'Nom',
      accessor: 'name',
      sticky: 'left',
      priority: 'high',
      minWidth: '200px',
      render: (value: unknown, row: MailingList, _index: number) => (
        <div>
          <p className="font-medium text-text-primary">{value}</p>
          {row.description && (
            <p className="text-xs text-text-tertiary mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: 'target_type',
      priority: 'high',
      minWidth: '120px',
      render: (value: unknown) => (
        <span className="text-sm capitalize">
          {value === 'contacts' ? 'Contacts' : 'Organisations'}
        </span>
      ),
    },
    {
      header: 'Destinataires',
      accessor: 'recipient_count',
      priority: 'high',
      minWidth: '140px',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-tertiary" />
          <span className="font-semibold text-primary">{value}</span>
        </div>
      ),
    },
    {
      header: 'Dernière utilisation',
      accessor: 'last_used_at',
      priority: 'medium',
      minWidth: '150px',
      render: (value: unknown, _row, _index: number) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : 'Jamais utilisée',
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      priority: 'low',
      minWidth: '120px',
      render: (value: unknown) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: unknown, row: MailingList, _index: number) => {
        const actions: OverflowAction[] = [
          {
            label: 'Modifier',
            icon: Edit,
            onClick: () => handleEdit(row),
            variant: 'default',
          },
          {
            label: 'Supprimer',
            icon: Trash2,
            onClick: () => handleDelete(id),
            variant: 'danger',
          },
        ]
        return <OverflowMenu actions={actions} />
      },
    },
  ]

  const totalRecipients = lists.reduce((acc, list) => acc + list.recipient_count, 0)

  return (
    <div className="space-y-spacing-lg p-spacing-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <List className="w-8 h-8 text-primary" />
            Listes de Diffusion
          </h1>
          <p className="text-text-secondary mt-1">
            Gérez vos listes de destinataires réutilisables
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={handleCreate}>
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle liste
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
        <Card>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Total listes</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{lists.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <List className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Total destinataires</p>
                <p className="text-3xl font-bold text-primary mt-1">{totalRecipients}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Moyenne par liste</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {lists.length > 0 ? Math.round(totalRecipients / lists.length) : 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Info */}
      <Alert
        type="info"
        message="Les listes de diffusion permettent de sauvegarder vos sélections de destinataires pour les réutiliser rapidement dans vos campagnes."
      />

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                {`Listes (${lists.length})`}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">Toutes vos listes de diffusion</p>
            </div>
            <List className="w-5 h-5 text-primary" />
          </div>
        </CardHeader>
        <CardBody>
          <TableV2<MailingList>
            columns={columns}
            data={lists}
            rowKey={(row) => row.id.toString()}
            size="md"
            variant="default"
            stickyHeader
            emptyMessage="Aucune liste créée. Créez votre première liste de diffusion !"
          />
        </CardBody>
      </Card>

      {/* Modal Créer/Éditer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingList ? 'Modifier la liste' : 'Créer une liste'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingList ? 'Mettre à jour' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className="space-y-spacing-md">
          <Alert
            type="info"
            message="Créez une liste vide que vous pourrez ensuite utiliser dans le wizard de campagne pour sélectionner et sauvegarder des destinataires."
          />

          <Input
            label="Nom de la liste *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Clients France, Prospects Q1 2025"
            required
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'usage de cette liste..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
            />
          </div>

          <Select
            label="Type de destinataires *"
            value={formData.target_type}
            onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
            required
          >
            <option value="contacts">Contacts (Personnes)</option>
            <option value="organisations">Organisations</option>
          </Select>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
