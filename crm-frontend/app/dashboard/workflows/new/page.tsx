'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Sparkles,
  ArrowLeft,
  Save,
  Play,
  Zap,
  AlertCircle,
  Wand2,
  Code,
} from 'lucide-react'
import { HelpTooltip } from '@/components/help/HelpTooltip'

// Builder visuel avec @xyflow/react (chargement dynamique)
const WorkflowBuilderClient = dynamic(
  () => import('@/components/workflows/WorkflowBuilder.client'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 dark:text-purple-400 font-medium">
            🎨 Chargement du builder visuel...
          </p>
        </div>
      </div>
    ),
  }
)

const TRIGGER_TYPES = [
  {
    value: 'manual',
    label: 'Manuel',
    icon: '👆',
    description: 'Déclenché manuellement',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  },
  {
    value: 'organisation_created',
    label: 'Nouvelle organisation',
    icon: '🏢',
    description: 'Quand une organisation est créée',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  },
  {
    value: 'organisation_updated',
    label: 'Organisation modifiée',
    icon: '✏️',
    description: 'Quand une organisation est mise à jour',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  },
  {
    value: 'deal_created',
    label: 'Deal créé',
    icon: '💼',
    description: 'Quand un deal est créé',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  },
  {
    value: 'deal_updated',
    label: 'Deal modifié',
    icon: '📊',
    description: 'Quand un deal est mis à jour',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
  },
  {
    value: 'deal_stage_changed',
    label: 'Changement de stage',
    icon: '🎯',
    description: 'Quand un deal change de stage',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
  },
  {
    value: 'scheduled',
    label: 'Programmé',
    icon: '⏰',
    description: 'Exécution quotidienne',
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
  },
  {
    value: 'inactivity_delay',
    label: 'Délai d\'inactivité',
    icon: '⏱️',
    description: 'Après une période d\'inactivité',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  },
]

export default function NewWorkflowPage() {
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'trigger' | 'builder'>('info')
  const [mode, setMode] = useState<'visual' | 'json'>('visual')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données du formulaire
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('manual')
  const [triggerConfig, setTriggerConfig] = useState('{}')
  const [actionsJson, setActionsJson] = useState('[]')

  // Données du builder visuel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [builderData, setBuilderData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  })

  const handleSave = async (asDraft = true) => {
    if (!name.trim()) {
      setError('Le nom du workflow est requis')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token')

      // Parser JSON
      let parsedTriggerConfig = null
      if (triggerConfig.trim() && triggerConfig !== '{}') {
        try {
          parsedTriggerConfig = JSON.parse(triggerConfig)
        } catch {
          throw new Error('Configuration trigger invalide (JSON mal formé)')
        }
      }

      const parsedConditions = null

      let parsedActions = []

      // Mode visuel : convertir nodes en actions
      if (mode === 'visual') {
        parsedActions = builderData.nodes
          .filter((node) => node.type !== 'input') // Exclure le trigger
          .map((node) => ({
            type: node.data.actionType || 'custom_action',
            config: node.data.config || {},
          }))

        if (parsedActions.length === 0) {
          throw new Error('Veuillez ajouter au moins une action au workflow')
        }
      } else {
        // Mode JSON
        try {
          parsedActions = JSON.parse(actionsJson)
          if (!Array.isArray(parsedActions)) {
            throw new Error('Actions doit être un tableau')
          }
        } catch {
          throw new Error('Actions invalides (JSON mal formé)')
        }
      }

      const workflowData = {
        name,
        description: description || undefined,
        status: asDraft ? 'draft' : 'active',
        trigger_type: triggerType,
        trigger_config: parsedTriggerConfig,
        conditions: parsedConditions,
        actions: parsedActions,
        is_template: false,
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
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

      const created = await response.json()
      router.push(`/dashboard/workflows/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const selectedTrigger = TRIGGER_TYPES.find((t) => t.value === triggerType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/workflows')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  Nouveau Workflow
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Créez votre automation en quelques étapes
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {step === 'builder' && (
                <>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setMode('visual')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        mode === 'visual'
                          ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Wand2 className="w-4 h-4" />
                      Visuel
                    </button>
                    <button
                      onClick={() => setMode('json')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        mode === 'json'
                          ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Code className="w-4 h-4" />
                      JSON
                    </button>
                  </div>

                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Brouillon
                  </button>

                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/30 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Activer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-12">
          {(['info', 'trigger', 'builder'] as const).map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center gap-3 px-6 py-3 rounded-lg transition cursor-pointer ${
                  step === s
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : step === 'info' && s !== 'info'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    : step === 'trigger' && s === 'builder'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => {
                  if (
                    (s === 'trigger' && step !== 'info') ||
                    (s === 'builder' && (step === 'trigger' || step === 'builder'))
                  ) {
                    setStep(s)
                  }
                }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 font-bold">
                  {idx + 1}
                </div>
                <span className="font-medium capitalize">{s === 'info' ? 'Informations' : s === 'trigger' ? 'Déclencheur' : 'Actions'}</span>
              </div>
              {idx < 2 && (
                <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-700 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step: Info */}
        {step === 'info' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Informations générales
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom du workflow *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Relance automatique deal inactif"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Décrivez l'objectif de ce workflow..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"
                  />
                </div>

                <button
                  onClick={() => setStep('trigger')}
                  disabled={!name.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer vers le déclencheur →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Trigger */}
        {step === 'trigger' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-500" />
                  Choisir le déclencheur
                </h2>
                <HelpTooltip
                  content="Le déclencheur définit l'événement qui lance automatiquement votre workflow. Par exemple : création d'une organisation, changement de stage d'un deal, ou à une heure programmée chaque jour."
                  learnMoreLink="/dashboard/help/guides/workflows#declencheurs"
                  size="md"
                />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Quand ce workflow doit-il s'exécuter ?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {TRIGGER_TYPES.map((trigger) => (
                  <button
                    key={trigger.value}
                    onClick={() => setTriggerType(trigger.value)}
                    className={`p-6 rounded-xl text-left transition border-2 ${
                      triggerType === trigger.value
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{trigger.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {trigger.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trigger.description}
                        </p>
                      </div>
                      {triggerType === trigger.value && (
                        <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Configuration trigger (optionnel) */}
              {selectedTrigger && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-blue-900 dark:text-blue-200 text-sm">
                      Configuration (optionnel)
                    </h3>
                    <HelpTooltip
                      content="Personnalisez le comportement du déclencheur avec du JSON. Par exemple, pour un workflow programmé : définissez l'heure d'exécution. Pour un délai d'inactivité : précisez le nombre de jours."
                      learnMoreLink="/dashboard/help/guides/workflows#configuration-avancee"
                      size="sm"
                    />
                  </div>
                  <textarea
                    value={triggerConfig}
                    onChange={(e) => setTriggerConfig(e.target.value)}
                    rows={3}
                    placeholder='{"schedule": "daily", "time": "09:00"}'
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => setStep('builder')}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/30"
                >
                  Continuer vers les actions →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Builder */}
        {step === 'builder' && (
          <div>
            {mode === 'visual' ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-600" />
                    Builder Visuel
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Glissez-déposez les actions pour construire votre workflow
                  </p>
                </div>

                <WorkflowBuilderClient
                  onUpdate={(nodes, edges) => setBuilderData({ nodes, edges })}
                />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setStep('trigger')}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    ← Retour
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-600" />
                    Mode JSON
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Définissez les actions en JSON (pour utilisateurs avancés)
                  </p>
                </div>

                <textarea
                  value={actionsJson}
                  onChange={(e) => setActionsJson(e.target.value)}
                  rows={20}
                  placeholder={`[
  {
    "type": "create_task",
    "config": {
      "title": "Relancer {{organisation.nom}}",
      "priority": "high"
    }
  }
]`}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setStep('trigger')}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    ← Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
