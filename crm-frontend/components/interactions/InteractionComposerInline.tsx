/**
 * InteractionComposerInline - Formulaire rapide de création d'interaction
 *
 * Mode inline (dans l'onglet Activité)
 * Champs simplifiés: type, titre, description
 * Prepend optimiste à la liste
 */

'use client'

import React, { useState } from 'react'
import { useCreateInteraction } from '@/hooks/useInteractions'
import type { InteractionType } from '@/types/interaction'
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPE_ICONS } from '@/types/interaction'
import { Send } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export interface InteractionComposerInlineProps {
  defaultOrgId?: number
  defaultPersonId?: number
  onCreated?: () => void
}

export default function InteractionComposerInline({
  defaultOrgId,
  defaultPersonId,
  onCreated,
}: InteractionComposerInlineProps) {
  const [type, setType] = useState<InteractionType>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const createMutation = useCreateInteraction()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    try {
      await createMutation.mutateAsync({
        org_id: defaultOrgId,
        person_id: defaultPersonId,
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      })

      // Reset form
      setTitle('')
      setBody('')
      setType('note')

      showToast({
        type: 'success',
        title: 'Interaction créée',
      })

      onCreated?.()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur lors de la création',
        message: error.message,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Nouvelle interaction
      </h3>

      {/* Type selector */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {(['call', 'email', 'meeting', 'visio', 'note', 'other'] as const).map((t) => {
          const Icon = INTERACTION_TYPE_ICONS[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`
                flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  type === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              <Icon size={16} />
              <span className="hidden md:inline">{INTERACTION_TYPE_LABELS[t]}</span>
            </button>
          )
        })}
      </div>

      {/* Titre */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de l'interaction..."
        required
        maxLength={200}
        className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      />

      {/* Description */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Description (optionnel)..."
        rows={2}
        className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
      />

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!title.trim() || createMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Création...
            </>
          ) : (
            <>
              <Send size={16} />
              Créer
            </>
          )}
        </button>
      </div>
    </form>
  )
}
