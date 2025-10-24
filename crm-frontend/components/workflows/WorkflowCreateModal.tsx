// components/workflows/WorkflowCreateModal.tsx
// Modal MVP pour créer un workflow (avec JSON pour conditions/actions)

'use client'

import React, { useState } from 'react'
import { X, Zap, AlertCircle, Workflow } from 'lucide-react'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import dynamic from 'next/dynamic'

// Import dynamique pour éviter SSR issues avec ReactFlow
const WorkflowBuilderClient = dynamic(() => import('./WorkflowBuilder.client'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du builder visuel...</p>
      </div>
    </div>
  ),
})

interface WorkflowCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manuel' },
  { value: 'organisation_created', label: 'Nouvelle organisation' },
  { value: 'organisation_updated', label: 'Organisation modifiée' },
  { value: 'deal_created', label: 'Deal créé' },
  { value: 'deal_updated', label: 'Deal modifié' },
  { value: 'deal_stage_changed', label: 'Changement de stage' },
  { value: 'scheduled', label: 'Programmé (quotidien)' },
  { value: 'inactivity_delay', label: 'Délai d\'inactivité' },
]

const EXAMPLE_CONDITIONS = `{
  "operator": "AND",
  "rules": [
    {
      "field": "organisation.pipeline_stage",
      "operator": "==",
      "value": "PROPOSITION"
    }
  ]
}`

const EXAMPLE_ACTIONS = `[
  {
    "type": "create_task",
    "config": {
      "title": "Relancer client {{organisation.nom}}",
      "description": "Suivi nécessaire",
      "priority": "high",
      "due_date": "+7 days"
    }
  },
  {
    "type": "send_notification",
    "config": {
      "user_id": 1,
      "message": "Nouvelle tâche créée pour {{organisation.nom}}",
      "type": "info"
    }
  }
]`

export default function WorkflowCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: WorkflowCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useVisualBuilder, setUseVisualBuilder] = useState(false) // Désactivé temporairement en attente de fix ReactFlow

  // Données du formulaire
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('manual')
  const [triggerConfig, setTriggerConfig] = useState('{}')
  const [conditions, setConditions] = useState('')
  const [actions, setActions] = useState(EXAMPLE_ACTIONS)

  // Ref pour stocker les nodes/edges du builder visuel
  const [builderData, setBuilderData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token')

      // Parser JSON
      let parsedTriggerConfig = null
      if (triggerConfig.trim()) {
        try {
          parsedTriggerConfig = JSON.parse(triggerConfig)
        } catch (err) {
          throw new Error('Configuration trigger invalide (JSON mal formé)')
        }
      }

      let parsedConditions = null
      if (conditions.trim()) {
        try {
          parsedConditions = JSON.parse(conditions)
        } catch (err) {
          throw new Error('Conditions invalides (JSON mal formé)')
        }
      }

      let parsedActions = []

      // Si mode visuel, convertir les nodes en actions
      if (useVisualBuilder) {
        parsedActions = builderData.nodes
          .filter((node) => node.type !== 'input') // Exclure le trigger
          .map((node) => ({
            type: node.data.label || 'custom_action',
            config: node.data.config || {},
          }))

        if (parsedActions.length === 0) {
          throw new Error('Veuillez ajouter au moins une action au workflow')
        }
      } else {
        // Mode JSON
        try {
          parsedActions = JSON.parse(actions)
          if (!Array.isArray(parsedActions)) {
            throw new Error('Actions doit être un tableau')
          }
        } catch (err) {
          throw new Error('Actions invalides (JSON mal formé)')
        }
      }

      const workflowData = {
        name,
        description: description || undefined,
        status: 'draft', // Créé en brouillon par défaut
        trigger_type: triggerType,
        trigger_config: parsedTriggerConfig,
        conditions: parsedConditions,
        actions: parsedActions,
        is_template: false,
      }

      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(workflowData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create workflow')
      }

      // Succès
      if (onSuccess) onSuccess()
      onClose()

      // Reset form
      setName('')
      setDescription('')
      setTriggerType('manual')
      setTriggerConfig('{}')
      setConditions('')
      setActions(EXAMPLE_ACTIONS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col ${useVisualBuilder ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Nouveau Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Toggle Mode */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Mode de configuration</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseVisualBuilder(!useVisualBuilder)}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  {useVisualBuilder ? 'Passer en JSON' : 'Passer en visuel'}
                </button>
              </div>
              <p className="text-sm text-purple-700">
                {useVisualBuilder
                  ? '✨ Builder visuel activé - Glissez-déposez vos actions'
                  : '⚙️ Mode JSON - Pour les utilisateurs avancés'}
              </p>
            </div>

            {/* Informations de base */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Informations générales</h3>

              <Input
                label="Nom du workflow *"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Relance automatique deal inactif"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Description du workflow..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bleu focus:outline-none"
                />
              </div>
            </div>

            {/* Déclencheur */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 border-b pb-2">Déclencheur</h3>

              <Select
                label="Type de déclencheur *"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                options={TRIGGER_TYPES}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration trigger (JSON optionnel)
                </label>
                <textarea
                  value={triggerConfig}
                  onChange={(e) => setTriggerConfig(e.target.value)}
                  rows={3}
                  placeholder='{"schedule": "daily"}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-bleu focus:outline-none"
                />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 border-b pb-2">Conditions (optionnel)</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conditions JSON
                </label>
                <textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  rows={6}
                  placeholder={EXAMPLE_CONDITIONS}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-bleu focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opérateurs disponibles : ==, !=, &gt;, &lt;, &gt;=, &lt;=, contains, in
                </p>
              </div>
            </div>

            {/* Actions - Conditionnel selon mode */}
            {useVisualBuilder ? (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 border-b pb-2">Workflow visuel *</h3>
                <WorkflowBuilderClient
                  onUpdate={(nodes, edges) => {
                    setBuilderData({ nodes, edges })
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 border-b pb-2">Actions (JSON) *</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actions JSON (tableau)
                  </label>
                  <textarea
                    value={actions}
                    onChange={(e) => setActions(e.target.value)}
                    rows={10}
                    required={!useVisualBuilder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-bleu focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Types disponibles : create_task, send_email, send_notification, update_field, assign_user, add_tag
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Le workflow sera créé en statut <strong>Brouillon</strong>
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !name || (useVisualBuilder && builderData.nodes.filter((n) => n.type !== 'input').length === 0)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Création...' : 'Créer le workflow'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
