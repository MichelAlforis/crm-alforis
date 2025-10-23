'use client'

import React, { useState, useEffect } from 'react'
import { Save, List, Download } from 'lucide-react'
import { RecipientSelectorTableV2, RecipientFilters } from '../RecipientSelectorTableV2'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Select'
import { Modal } from '@/components/shared/Modal'
import { Input } from '@/components/shared/Input'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

interface Step2RecipientsProps {
  recipient_filters: RecipientFilters
  onChange: (filters: RecipientFilters) => void
  onCountChange?: (count: number) => void
}

interface MailingList {
  id: number
  name: string
  description?: string
  target_type: string
  filters: RecipientFilters
  recipient_count: number
}

export const Step2Recipients: React.FC<Step2RecipientsProps> = ({
  recipient_filters,
  onChange,
  onCountChange,
}) => {
  const { showToast } = useToast()
  const [mailingLists, setMailingLists] = useState<MailingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveListName, setSaveListName] = useState('')
  const [saveListDescription, setSaveListDescription] = useState('')
  const [recipientCount, setRecipientCount] = useState(0)

  // Charger les listes disponibles
  useEffect(() => {
    const loadLists = async () => {
      try {
        const response = await apiClient.get<{ items: MailingList[] }>('/mailing-lists')
        setMailingLists(response.data.items || [])
      } catch (error) {
        console.error('Failed to load mailing lists:', error)
      }
    }
    loadLists()
  }, [])

  // Charger une liste
  const handleLoadList = async (listId: string) => {
    if (!listId) return

    const list = mailingLists.find(l => l.id === Number(listId))
    if (!list) return

    // Appliquer les filtres de la liste + ajouter target_type depuis la liste
    onChange({
      ...list.filters,
      target_type: list.target_type as any, // Ajouter target_type manquant
    })
    setSelectedListId(listId)

    // Marquer comme utilisée
    try {
      await apiClient.post(`/mailing-lists/${listId}/mark-used`, {})
    } catch (error) {
      console.error('Failed to mark list as used:', error)
    }

    showToast({
      type: 'success',
      title: `Liste "${list.name}" chargée (${list.recipient_count} destinataires)`,
    })
  }

  // Sauvegarder comme nouvelle liste
  const handleSaveAsList = async () => {
    if (!saveListName.trim()) {
      showToast({ type: 'error', title: 'Veuillez renseigner un nom' })
      return
    }

    try {
      const response = await apiClient.post<MailingList>('/mailing-lists', {
        name: saveListName,
        description: saveListDescription,
        target_type: recipient_filters.target_type,
        filters: recipient_filters,
        recipient_count: recipientCount,
      })

      showToast({
        type: 'success',
        title: `Liste "${saveListName}" créée avec ${recipientCount} destinataires`,
      })

      // Recharger les listes
      const listsResponse = await apiClient.get<{ items: MailingList[] }>('/mailing-lists')
      setMailingLists(listsResponse.data.items || [])

      // Sélectionner la nouvelle liste
      setSelectedListId(response.data.id.toString())

      setIsSaveModalOpen(false)
      setSaveListName('')
      setSaveListDescription('')
    } catch (error) {
      console.error('Failed to save list:', error)
      showToast({ type: 'error', title: 'Erreur lors de la sauvegarde' })
    }
  }

  return (
    <div className="space-y-spacing-md">
      {/* Actions en haut */}
      <div className="flex items-center gap-4 p-spacing-sm bg-muted/10 rounded-radius-md border border-border">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-tertiary mb-1">
            Charger une liste existante
          </label>
          <Select
            value={selectedListId}
            onChange={(e) => handleLoadList(e.target.value)}
            className="w-full"
          >
            <option value="">-- Sélectionner une liste --</option>
            {mailingLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.recipient_count} destinataires)
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSaveModalOpen(true)}
            leftIcon={<Save className="h-4 w-4" />}
            disabled={recipientCount === 0}
          >
            Sauvegarder comme liste
          </Button>
        </div>
      </div>

      {/* Info si liste chargée */}
      {selectedListId && (
        <Alert
          type="info"
          message={`Liste "${mailingLists.find(l => l.id === Number(selectedListId))?.name}" chargée. Vous pouvez modifier les filtres ci-dessous.`}
        />
      )}

      {/* Sélecteur de destinataires */}
      <RecipientSelectorTableV2
        value={recipient_filters}
        onChange={onChange}
        onCountChange={(count) => {
          setRecipientCount(count)
          if (onCountChange) onCountChange(count)
        }}
        className="border-0 shadow-none"
      />

      {/* Modal Sauvegarder */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Sauvegarder comme liste de diffusion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSaveAsList}>
              Sauvegarder
            </Button>
          </>
        }
      >
        <div className="space-y-spacing-md">
          <Alert
            type="info"
            message={`Cette sélection contient ${recipientCount} destinataire(s). Vous pourrez la réutiliser dans vos futures campagnes.`}
          />

          <Input
            label="Nom de la liste *"
            value={saveListName}
            onChange={(e) => setSaveListName(e.target.value)}
            placeholder="Ex: Clients actifs Q1 2025"
            required
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={saveListDescription}
              onChange={(e) => setSaveListDescription(e.target.value)}
              placeholder="Décrivez cette liste..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
            />
          </div>

          <div className="bg-muted/10 rounded-radius-sm p-spacing-sm border border-border">
            <p className="text-xs font-medium text-text-secondary mb-2">Filtres appliqués:</p>
            <ul className="text-xs text-text-tertiary space-y-1">
              <li>Type: {recipient_filters.target_type === 'contacts' ? 'Contacts' : 'Organisations'}</li>
              {recipient_filters.languages && recipient_filters.languages.length > 0 && (
                <li>Langues: {recipient_filters.languages.join(', ')}</li>
              )}
              {recipient_filters.countries && recipient_filters.countries.length > 0 && (
                <li>Pays: {recipient_filters.countries.join(', ')}</li>
              )}
              {recipient_filters.organisation_categories && recipient_filters.organisation_categories.length > 0 && (
                <li>Catégories: {recipient_filters.organisation_categories.join(', ')}</li>
              )}
              {recipient_filters.exclude_ids && recipient_filters.exclude_ids.length > 0 && (
                <li>Exclusions: {recipient_filters.exclude_ids.length} destinataire(s)</li>
              )}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Step2Recipients
