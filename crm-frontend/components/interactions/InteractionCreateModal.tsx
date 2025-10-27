// components/interactions/InteractionCreateModal.tsx
// Modal simplifié pour créer une interaction

'use client'

import React, { useState } from 'react'
import { X, Phone, Mail, Users, Coffee, FileText, Calendar } from 'lucide-react'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'

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
  const [selectedOrgId, setSelectedOrgId] = useState(organisationId || 0)
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
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token')

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nouvelle Interaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Type d'interaction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          ? 'border-bleu bg-blue-50 text-bleu'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date et heure *
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bleu focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description / Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Détails de l'interaction, résultats, next steps..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bleu focus:outline-none"
              />
            </div>

            {/* Participant (simplifié) */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Contact principal (optionnel)</h3>
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
              disabled={loading || !title || selectedOrgId === 0}
              className="px-4 py-2 bg-bleu text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Création...' : 'Créer l\'interaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
