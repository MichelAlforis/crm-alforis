// components/activities/QuickInteractionButton.tsx
// Bouton rapide pour créer une interaction simple (email, call, note)

'use client'

import React, { useState } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import { Mail, Phone, FileText, Plus, X } from 'lucide-react'

interface QuickInteractionButtonProps {
  organisationId: number
  onSuccess?: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const quickTypes = [
  { value: 'email', label: 'Email envoyé', icon: Mail, color: 'bg-purple-500' },
  { value: 'appel', label: 'Appel passé', icon: Phone, color: 'bg-blue-500' },
  { value: 'note', label: 'Note rapide', icon: FileText, color: 'bg-gray-500' },
]

export default function QuickInteractionButton({
  organisationId,
  onSuccess,
}: QuickInteractionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')

  const handleQuickCreate = async () => {
    if (!selectedType || !title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

      const payload: any = {
        organisation_id: organisationId,
        type: selectedType,
        title: title.trim(),
        description: description.trim() || undefined,
        recipients: [],
      }

      // Ajouter le destinataire si renseigné
      if (recipientEmail || recipientName) {
        payload.recipients.push({
          email: recipientEmail || undefined,
          name: recipientName || recipientEmail || undefined,
        })
      }

      const response = await fetch(`${API_BASE}/api/v1/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create interaction')
      }

      // Success
      setIsOpen(false)
      setSelectedType(null)
      setTitle('')
      setDescription('')
      setRecipientEmail('')
      setRecipientName('')

      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus className="h-4 w-4" />
        Interaction rapide
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Créer une interaction rapide</h3>
          <button
            onClick={() => {
              setIsOpen(false)
              setSelectedType(null)
              setError(null)
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Type selection */}
          {!selectedType ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">Quel type d'interaction ?</p>
              {quickTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3 text-left"
                  >
                    <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-slate-100">{type.label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type selected badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const type = quickTypes.find((t) => t.value === selectedType)
                    const Icon = type?.icon || FileText
                    return (
                      <>
                        <div className={`w-8 h-8 ${type?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-slate-100">{type?.label}</span>
                      </>
                    )
                  })()}
                </div>
                <button
                  onClick={() => setSelectedType(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Changer
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    selectedType === 'email'
                      ? 'Ex: Proposition commerciale Q4'
                      : selectedType === 'appel'
                      ? 'Ex: Call découverte produit'
                      : 'Ex: Décision de partenariat validée'
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Recipient (for email/call) */}
              {(selectedType === 'email' || selectedType === 'appel') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Destinataire
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Nom"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Détails supplémentaires..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedType && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800">
            <button
              onClick={() => {
                setIsOpen(false)
                setSelectedType(null)
                setTitle('')
                setDescription('')
                setRecipientEmail('')
                setRecipientName('')
              }}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleQuickCreate}
              disabled={loading || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
