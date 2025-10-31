// components/activities/CreateActivityModal.tsx
// Modal pour créer une activité avec plusieurs participants

'use client'

import React, { useState } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import { X, Plus, Trash2, Users, Phone, Mail, Coffee, FileText } from 'lucide-react'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nouvelle interaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Type d'activité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ex: Réunion de suivi Q4, Call découverte..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date/Heure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date et heure
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Détails de l'interaction..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Participants */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Participants ({participants.length})
                </label>
                <button
                  type="button"
                  onClick={addParticipant}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter participant
                </button>
              </div>

              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-gray-700">
                        Participant {index + 1}
                      </h4>
                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
                        className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                      />
                      <input
                        type="email"
                        value={participant.external_email || ''}
                        onChange={(e) =>
                          updateParticipant(index, 'external_email', e.target.value)
                        }
                        placeholder="Email"
                        className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                      />
                      <input
                        type="text"
                        value={participant.external_role || ''}
                        onChange={(e) =>
                          updateParticipant(index, 'external_role', e.target.value)
                        }
                        placeholder="Fonction (ex: CEO, CFO)"
                        className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={participant.is_organizer}
                          onChange={(e) =>
                            updateParticipant(index, 'is_organizer', e.target.checked)
                          }
                          className="rounded border-gray-300"
                        />
                        Organisateur
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Création...' : 'Créer l\'interaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
