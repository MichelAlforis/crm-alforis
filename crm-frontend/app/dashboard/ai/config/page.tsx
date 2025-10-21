/**
 * Page de configuration de l'Agent IA
 */
'use client'

import React, { useState, useEffect } from 'react'
import { useAIConfig, useUpdateAIConfig } from '@/hooks/useAI'
import { AIProvider } from '@/types/ai'
import { Settings, Save, Eye, EyeOff, Zap } from 'lucide-react'
import clsx from 'clsx'

export default function AIConfigPage() {
  const { data: config, isLoading } = useAIConfig()
  const updateConfig = useUpdateAIConfig()

  const [formData, setFormData] = useState({
    provider: AIProvider.ANTHROPIC,
    model_name: 'claude-3-5-sonnet-20241022',
    api_key: '',
    temperature: 0.3,
    max_tokens: 1000,
    duplicate_threshold: 0.85,
    enrichment_threshold: 0.70,
    quality_threshold: 0.60,
    auto_apply_enabled: false,
    auto_apply_threshold: 0.95,
    daily_budget_usd: 10.0,
    cache_enabled: true,
    cache_ttl_hours: 24,
  })

  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    if (config) {
      setFormData({
        provider: config.provider,
        model_name: config.model_name,
        api_key: '', // Never show API key
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        duplicate_threshold: config.duplicate_threshold,
        enrichment_threshold: config.enrichment_threshold,
        quality_threshold: config.quality_threshold,
        auto_apply_enabled: config.auto_apply_enabled,
        auto_apply_threshold: config.auto_apply_threshold,
        daily_budget_usd: config.daily_budget_usd,
        cache_enabled: config.cache_enabled,
        cache_ttl_hours: config.cache_ttl_hours,
      })
    }
  }, [config])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Only send API key if it was modified
    const payload: any = { ...formData }
    if (!formData.api_key) {
      delete payload.api_key
    }

    updateConfig.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-10 w-10 text-purple-600" />
            Configuration Agent IA
          </h1>
          <p className="text-gray-600 mt-2">
            Paramètres de l'intelligence artificielle et contrôles de sécurité
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider & Model */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Fournisseur IA
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData({ ...formData, provider: e.target.value as AIProvider })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={AIProvider.ANTHROPIC}>Anthropic (Claude)</option>
                  <option value={AIProvider.OPENAI}>OpenAI (GPT)</option>
                  <option value={AIProvider.OLLAMA}>Ollama (Local)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modèle
                </label>
                <input
                  type="text"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="claude-3-5-sonnet-20241022"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key {config?.api_key_set && <span className="text-green-600">(✓ configurée)</span>}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-ant-... ou sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour conserver la clé actuelle
              </p>
            </div>
          </div>

          {/* Model Parameters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Paramètres du modèle</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (créativité)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">0.0 (précis) - 1.0 (créatif)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={formData.max_tokens}
                  onChange={(e) =>
                    setFormData({ ...formData, max_tokens: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Seuils de confiance</h2>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Détection doublons</span>
                  <span className="text-blue-600">{(formData.duplicate_threshold * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={formData.duplicate_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, duplicate_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Enrichissement</span>
                  <span className="text-blue-600">{(formData.enrichment_threshold * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={formData.enrichment_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, enrichment_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Contrôle qualité</span>
                  <span className="text-blue-600">{(formData.quality_threshold * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={formData.quality_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, quality_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Auto-apply */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Application automatique</h2>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-apply"
                checked={formData.auto_apply_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, auto_apply_enabled: e.target.checked })
                }
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="auto-apply" className="text-sm font-medium text-gray-700">
                Appliquer automatiquement les suggestions avec haute confiance
              </label>
            </div>

            {formData.auto_apply_enabled && (
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Seuil d'auto-application</span>
                  <span className="text-blue-600">{(formData.auto_apply_threshold * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.9"
                  max="1"
                  step="0.01"
                  value={formData.auto_apply_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, auto_apply_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Seules les suggestions avec ≥ {(formData.auto_apply_threshold * 100).toFixed(0)}% de confiance seront appliquées automatiquement
                </p>
              </div>
            )}
          </div>

          {/* Budget & Cache */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Budget et optimisation</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget quotidien (USD)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={formData.daily_budget_usd}
                  onChange={(e) =>
                    setFormData({ ...formData, daily_budget_usd: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée du cache (heures)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  step="1"
                  value={formData.cache_ttl_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, cache_ttl_hours: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="cache-enabled"
                checked={formData.cache_enabled}
                onChange={(e) => setFormData({ ...formData, cache_enabled: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cache-enabled" className="text-sm font-medium text-gray-700">
                Activer le cache (économise 70-80% des coûts API)
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={updateConfig.isPending}
              className={clsx(
                'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
                'hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save className="h-4 w-4" />
              {updateConfig.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
