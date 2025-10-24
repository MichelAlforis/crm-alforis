'use client'

import { Copy, Clock, Tag, Zap } from 'lucide-react'
import { WorkflowTemplateMetadata } from '@/hooks/useWorkflowTemplates'

interface WorkflowTemplate {
  id: number
  name: string
  description?: string
  trigger_type: string
  status: string
  metadata: WorkflowTemplateMetadata
}

interface WorkflowTemplateCardProps {
  template: WorkflowTemplate
  onDuplicate: (id: number) => void
  onPreview: (id: number) => void
  isLoading?: boolean
}

const DIFFICULTY_COLORS = {
  facile: 'bg-green-100 text-green-800',
  intermediaire: 'bg-yellow-100 text-yellow-800',
  avance: 'bg-red-100 text-red-800',
}

const DIFFICULTY_LABELS = {
  facile: 'Facile',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
}

const CATEGORY_COLORS = {
  appels: 'bg-blue-100 text-blue-800',
  reunions: 'bg-purple-100 text-purple-800',
  mailing: 'bg-pink-100 text-pink-800',
  relations: 'bg-indigo-100 text-indigo-800',
  reporting: 'bg-gray-100 text-gray-800',
  prospection: 'bg-teal-100 text-teal-800',
}

export const WorkflowTemplateCard = ({
  template,
  onDuplicate,
  onPreview,
  isLoading
}: WorkflowTemplateCardProps) => {
  const { metadata } = template

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Header avec icône et catégorie */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between mb-2">
          <span className="text-3xl">{metadata.icon}</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[metadata.category]}`}>
            {metadata.category}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 text-lg mb-1">{template.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
      </div>

      {/* Body - Use cases */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Cas d'usage</h4>
          <ul className="space-y-1">
            {metadata.useCases.slice(0, 2).map((uc, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start">
                <span className="text-blue-500 mr-2">→</span>
                <span className="line-clamp-1">{uc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {metadata.tags.slice(0, 3).map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              <Tag size={10} className="mr-1" />
              {tag}
            </span>
          ))}
          {metadata.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{metadata.tags.length - 3}</span>
          )}
        </div>

        {/* Métadonnées */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            {/* Difficulté */}
            <span className={`px-2 py-1 text-xs font-medium rounded ${DIFFICULTY_COLORS[metadata.difficulty]}`}>
              {DIFFICULTY_LABELS[metadata.difficulty]}
            </span>

            {/* Temps de setup */}
            <span className="flex items-center text-xs text-gray-500">
              <Clock size={12} className="mr-1" />
              {metadata.estimatedSetupTime}min
            </span>
          </div>

          {/* Trigger type */}
          <span className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            <Zap size={12} className="mr-1" />
            {template.trigger_type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Prérequis si existant */}
        {metadata.prerequisites && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-orange-600 flex items-start">
              <span className="mr-1">⚠️</span>
              <span>{metadata.prerequisites}</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer - Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => onPreview(template.id)}
          className="flex-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Prévisualiser
        </button>
        <button
          onClick={() => onDuplicate(template.id)}
          className="flex-1 px-3 py-2 text-sm text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
          disabled={isLoading}
        >
          <Copy size={16} />
          {isLoading ? 'Duplication...' : 'Utiliser'}
        </button>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 border-2 border-purple-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}
