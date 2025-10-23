'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, List, Users, Calendar, Download } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Table } from '@/components/shared'
import { Modal } from '@/components/shared/Modal'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { useMailingLists } from '@/hooks/useMailingLists'
import { useExport } from '@/hooks/useExport'
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
  const {
    lists,
    isLoading,
    createList,
    updateList,
    deleteList,
    isCreating,
    isDeleting,
  } = useMailingLists()

  const { exportData, isExporting } = useExport({
    resource: 'mailing-lists',
    baseFilename: 'listes-diffusion',
  })

  const { confirm, ConfirmDialogComponent } = useConfirm()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingList, setEditingList] = useState<MailingList | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_type: 'contacts',
  })

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
      return
    }

    try {
      if (editingList) {
        await updateList(editingList.id, formData)
      } else {
        await createList({
          ...formData,
          filters: {},
          recipient_count: 0,
        })
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to save list:', error)
    }
  }

  const handleDelete = (list: MailingList) => {
    confirm({
      title: 'Supprimer la liste ?',
      message: `Êtes-vous sûr de vouloir supprimer "${list.name}" ? Cette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        await deleteList(list.id)
      },
    })
  }

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
      render: (value: string, row: MailingList) => (
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
      render: (value: string) => (
        <span className="text-sm capitalize">
          {value === 'contacts' ? 'Contacts' : 'Organisations'}
        </span>
      ),
    },
    {
      header: 'Destinataires',
      accessor: 'recipient_count',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-tertiary" />
          <span className="font-semibold text-primary">{value}</span>
        </div>
      ),
    },
    {
      header: 'Dernière utilisation',
      accessor: 'last_used_at',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : 'Jamais utilisée',
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number, row: MailingList) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            title="Modifier"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            disabled={isDeleting}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </Button>
        </div>
      ),
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
        <CardHeader
          title={`Listes (${lists.length})`}
          subtitle="Toutes vos listes de diffusion"
          icon={<List className="w-5 h-5 text-primary" />}
        />
        <CardBody>
          {/* Boutons d'export */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('csv')}
              disabled={isExporting || lists.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('excel')}
              disabled={isExporting || lists.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('pdf')}
              disabled={isExporting || lists.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>

          <Table
            data={lists}
            columns={columns}
            isLoading={isLoading}
            isEmpty={!isLoading && lists.length === 0}
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
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isCreating || !formData.name.trim()}
            >
              {isCreating ? 'Enregistrement...' : editingList ? 'Mettre à jour' : 'Créer'}
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

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </div>
  )
}
