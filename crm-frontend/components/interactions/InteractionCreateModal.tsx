// components/interactions/InteractionCreateModal.tsx
// Modal simplifié pour créer une interaction

'use client'

import React, { useState } from 'react'
import { Phone, Mail, Users, Coffee, FileText, Calendar } from 'lucide-react'
import { Input } from '@/components/shared/Input'
import { ModalForm } from '@/components/shared/Modal'
import { storage, AUTH_STORAGE_KEYS } from '@/lib/constants'

interface InteractionCreateModalProps {
  isOpen: boolean
  onClose: () => void
  organisationId?: number
  onSuccess?: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const activityTypes = [
  { value: 'appel', label: 'Appel téléphonique', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'reunion', label: 'Réunion', icon: Users },
  { value: 'dejeuner', label: 'Déjeuner', icon: Coffee },
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'autre', label: 'Autre', icon: Calendar },
]

export default function InteractionCreateModal({
  isOpen,
  onClose,
  organisationId,
  onSuccess,
}: InteractionCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données du formulaire
  const [selectedOrgId] = useState(organisationId || 0)
  const [type, setType] = useState('appel')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })

  // Participants
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantRole, setParticipantRole] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN) || storage.get(AUTH_STORAGE_KEYS.LEGACY_TOKEN)

      const recipients = []
      if (participantName || participantEmail) {
        recipients.push({
          name: participantName || undefined,
          email: participantEmail || undefined,
          role: participantRole || undefined,
          is_organizer: false,
        })
      }

      const interactionData = {
        organisation_id: selectedOrgId,
        type,
        title,
        description: description || undefined,
        occurred_at: new Date(occurredAt).toISOString(),
        recipients,
        metadata: {},
      }

      const response = await fetch(`${API_BASE}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(interactionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create interaction')
      }

      // Succès
      if (onSuccess) onSuccess()
      onClose()

      // Reset form
      setType('appel')
      setTitle('')
      setDescription('')
      setParticipantName('')
      setParticipantEmail('')
      setParticipantRole('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle Interaction"
      onSubmit={handleSubmit}
      submitLabel="Créer l'interaction"
      isLoading={loading}
      error={error}
      size="lg"
      submitDisabled={!title || selectedOrgId === 0}
    >
      <div className="space-y-4">
        {/* Type d'interaction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type d'interaction *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {activityTypes.map((actType) => {
              const Icon = actType.icon
              return (
                <button
                  key={actType.value}
                  type="button"
                  onClick={() => setType(actType.value)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    type === actType.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{actType.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Titre */}
        <Input
          label="Titre *"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ex: Call découverte produit, Email proposition..."
        />

        {/* Date/Heure */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date et heure *
          </label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description / Notes
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Détails de l'interaction, résultats, next steps..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Participant (simplifié) */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Contact principal (optionnel)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Nom"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="John Doe"
            />
            <Input
              label="Email"
              type="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <Input
            label="Fonction"
            type="text"
            value={participantRole}
            onChange={(e) => setParticipantRole(e.target.value)}
            placeholder="CEO, CFO, etc."
          />
        </div>
      </div>
    </ModalForm>
  )
}
