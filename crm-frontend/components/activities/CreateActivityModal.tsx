// components/activities/CreateActivityModal.tsx
// Modal pour créer une activité avec plusieurs participants

'use client'

import React, { useState } from 'react'
import { storage, AUTH_STORAGE_KEYS } from '@/lib/constants'
import { ModalForm } from '@/components/shared/Modal'
import { Plus, Trash2, Users, Phone, Mail, Coffee, FileText } from 'lucide-react'
import type { ActivityParticipant, CreateActivityWithParticipants } from '@/types/activity'

interface CreateActivityModalProps {
  isOpen: boolean
  onClose: () => void
  organisationId: number
  onSuccess?: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const activityTypes = [
  { value: 'appel', label: 'Appel téléphonique', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'reunion', label: 'Réunion', icon: Users },
  { value: 'dejeuner', label: 'Déjeuner d\'affaires', icon: Coffee },
  { value: 'note', label: 'Note', icon: FileText },
]

export default function CreateActivityModal({
  isOpen,
  onClose,
  organisationId,
  onSuccess,
}: CreateActivityModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données du formulaire
  const [type, setType] = useState('reunion')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })

  // Liste des participants
  const [participants, setParticipants] = useState<
    Omit<ActivityParticipant, 'id' | 'activity_id' | 'created_at' | 'updated_at' | 'display_name'>[]
  >([
    {
      person_id: undefined,
      organisation_id: organisationId,
      external_name: '',
      external_email: '',
      external_role: '',
      is_organizer: false,
      attendance_status: 'confirmed',
      notes: '',
    },
  ])

  const addParticipant = () => {
    setParticipants([
      ...participants,
      {
        person_id: undefined,
        organisation_id: organisationId,
        external_name: '',
        external_email: '',
        external_role: '',
        is_organizer: false,
        attendance_status: 'confirmed',
        notes: '',
      },
    ])
  }

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (
    index: number,
    field: keyof ActivityParticipant,
    value: any
  ) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], [field]: value }
    setParticipants(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

      // Filtrer les participants vides
      const validParticipants = participants.filter(
        (p) => p.person_id || p.external_name
      )

      const activityData: CreateActivityWithParticipants = {
        organisation_id: organisationId,
        type,
        title,
        description: description || undefined,
        occurred_at: new Date(occurredAt).toISOString(),
        participants: validParticipants,
      }

      const response = await fetch(
        `${API_BASE}/api/v1/organisations/${organisationId}/activities/with-participants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(activityData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create activity')
      }

      // Succès
      if (onSuccess) onSuccess()
      onClose()

      // Reset form
      setType('reunion')
      setTitle('')
      setDescription('')
      setParticipants([
        {
          person_id: undefined,
          organisation_id: organisationId,
          external_name: '',
          external_email: '',
          external_role: '',
          is_organizer: false,
          attendance_status: 'confirmed',
          notes: '',
        },
      ])
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
      title="Nouvelle interaction"
      onSubmit={handleSubmit}
      submitLabel="Créer l'interaction"
      isLoading={loading}
      submitDisabled={!title}
      error={error}
      size="lg"
    >
      <div className="space-y-6">
        {/* Type d'activité */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type d'interaction
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{actType.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Titre *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ex: Réunion de suivi Q4, Call découverte..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Date/Heure */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date et heure
          </label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Détails de l'interaction..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Participants ({participants.length})
            </label>
            <button
              type="button"
              onClick={addParticipant}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Ajouter participant
            </button>
          </div>

          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Participant {index + 1}
                  </h4>
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={participant.external_name || ''}
                    onChange={(e) =>
                      updateParticipant(index, 'external_name', e.target.value)
                    }
                    placeholder="Nom complet *"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    type="email"
                    value={participant.external_email || ''}
                    onChange={(e) =>
                      updateParticipant(index, 'external_email', e.target.value)
                    }
                    placeholder="Email"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={participant.external_role || ''}
                    onChange={(e) =>
                      updateParticipant(index, 'external_role', e.target.value)
                    }
                    placeholder="Fonction (ex: CEO, CFO)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={participant.is_organizer}
                      onChange={(e) =>
                        updateParticipant(index, 'is_organizer', e.target.checked)
                      }
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    Organisateur
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalForm>
  )
}
