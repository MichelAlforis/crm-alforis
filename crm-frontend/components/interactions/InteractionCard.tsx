/**
 * InteractionCard - Carte d'affichage d'une interaction
 *
 * Affiche:
 * - Type (icône + label)
 * - Titre + description
 * - Participants (internes + externes)
 * - Date relative
 * - Actions (edit, delete)
 */

'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Edit2, Trash2, Users, Building2 } from 'lucide-react'
import type { Interaction } from '@/types/interaction'
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPE_ICONS } from '@/types/interaction'

export interface InteractionCardProps {
  interaction: Interaction
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  compact?: boolean  // Mode compact pour widgets
  showOrganisation?: boolean  // Afficher le lien organisation
}

export default function InteractionCard({
  interaction,
  onEdit,
  onDelete,
  compact = false,
  showOrganisation = false,
}: InteractionCardProps) {
  const typeIcon = INTERACTION_TYPE_ICONS[interaction.type]
  const typeLabel = INTERACTION_TYPE_LABELS[interaction.type]

  const totalParticipants =
    (interaction.participants?.length || 0) +
    (interaction.external_participants?.length || 0)

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
        hover:shadow-md transition-shadow
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header: Type + Date */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" title={typeLabel}>
            {typeIcon}
          </span>
          <div>
            <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {typeLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(interaction.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </span>

          {!compact && (
            <>
              {onEdit && (
                <button
                  onClick={() => onEdit(interaction.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Supprimer cette interaction ?')) {
                      onDelete(interaction.id)
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Titre */}
      <h3 className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>
        {interaction.title}
      </h3>

      {/* Description (tronquée en mode compact) */}
      {interaction.body && (
        <p
          className={`
            mt-2 text-sm text-gray-600 dark:text-gray-400
            ${compact ? 'line-clamp-1' : 'line-clamp-2'}
          `}
        >
          {interaction.body}
        </p>
      )}

      {/* Footer: Participants + Organisation */}
      {(totalParticipants > 0 || showOrganisation) && (
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {/* Participants */}
          {totalParticipants > 0 && (
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>
                {totalParticipants} participant{totalParticipants > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Organisation */}
          {showOrganisation && interaction.org_id && (
            <div className="flex items-center gap-1">
              <Building2 size={14} />
              <a
                href={`/dashboard/organisations/${interaction.org_id}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 underline"
              >
                Voir organisation
              </a>
            </div>
          )}
        </div>
      )}

      {/* Pièces jointes */}
      {interaction.attachments && interaction.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {interaction.attachments.map((att, idx) => (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              📎 {att.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
