/**
 * Section de configuration de l'Agent IA
 * Extraite de /dashboard/ai/config pour centralisation
 */
'use client'
import { logger } from '@/lib/logger'

import React, { useState, useEffect } from 'react'
import { useAIConfig, useUpdateAIConfig } from '@/hooks/useAI'
import { AIProvider } from '@/types/ai'
import { Settings, Save, Eye, EyeOff, Zap, Key, ExternalLink, CheckCircle, AlertCircle, Brain } from 'lucide-react'
import clsx from 'clsx'
import { apiClient } from '@/lib/api'

export default function AIConfigSection() {
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

  // États pour les API keys
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    ollama: '',
  })

  const [apiKeysStatus, setApiKeysStatus] = useState({
    anthropic_configured: false,
    openai_configured: false,
    ollama_configured: false,
    using_env_fallback: true,
  })

  const [showApiKeys, setShowApiKeys] = useState({
    anthropic: false,
    openai: false,
    ollama: false,
  })

  const [isSavingKeys, setIsSavingKeys] = useState(false)

  // Charger le statut des clés API au montage
  useEffect(() => {
    const loadKeysStatus = async () => {
      try {
        const response = await fetch(`${apiClient.getBaseUrl()}/ai/config/api-keys/status`, {
          headers: {
            'Authorization': `Bearer ${apiClient.getToken()}`,
          },
        })
        if (response.ok) {
          const status = await response.json()
          setApiKeysStatus(status)
        }
      } catch (error) {
        logger.error('Erreur chargement statut clés:', error)
      }
    }
    loadKeysStatus()
  }, [])

  useEffect(() => {
    if (config) {
      setFormData({
        provider: config.provider ?? AIProvider.ANTHROPIC,
        model_name: config.model_name ?? 'claude-3-5-sonnet-20241022',
        api_key: '', // Never show API key
        temperature: config.temperature ?? 0.3,
        max_tokens: config.max_tokens ?? 1000,
        duplicate_threshold: config.duplicate_threshold ?? 0.85,
        enrichment_threshold: config.enrichment_threshold ?? 0.70,
        quality_threshold: config.quality_threshold ?? 0.60,
        auto_apply_enabled: config.auto_apply_enabled ?? false,
        auto_apply_threshold: config.auto_apply_threshold ?? 0.95,
        daily_budget_usd: config.daily_budget_usd ?? 10.0,
        cache_enabled: config.cache_enabled ?? true,
        cache_ttl_hours: config.cache_ttl_hours ?? 24,
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

  // Sauvegarder les clés API
  const handleSaveApiKeys = async () => {
    setIsSavingKeys(true)
    try {
      const payload: any = {}
      if (apiKeys.anthropic) payload.anthropic_key = apiKeys.anthropic
      if (apiKeys.openai) payload.openai_key = apiKeys.openai
      if (apiKeys.ollama) payload.ollama_url = apiKeys.ollama

      const response = await fetch(`${apiClient.getBaseUrl()}/ai/config/api-keys`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        setApiKeysStatus(result.status)
        setApiKeys({ anthropic: '', openai: '', ollama: '' }) // Clear inputs
        alert('✅ Clés API sauvegardées avec succès!')
      } else {
        const error = await response.json()
        alert(`❌ Erreur: ${error.detail}`)
      }
    } catch (error) {
      logger.error('Erreur sauvegarde clés:', error)
      alert('❌ Erreur lors de la sauvegarde des clés')
    } finally {
      setIsSavingKeys(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Intelligence Artificielle</h2>
            <p className="text-gray-600 mt-1">
              Configurez les paramètres de l'agent IA et les clés API des fournisseurs
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider & Model */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Fournisseur IA
          </h3>

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
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              Clés API
            </h3>
            {apiKeysStatus.using_env_fallback && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Utilise .env par défaut
              </span>
            )}
          </div>

          {/* Anthropic Claude */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Anthropic Claude API Key
              </label>
              <div className="flex items-center gap-2">
                {apiKeysStatus.anthropic_configured ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Configurée
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Non configurée</span>
                )}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Obtenir une clé
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type={showApiKeys.anthropic ? 'text' : 'password'}
                value={apiKeys.anthropic}
                onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="sk-ant-api03-xxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowApiKeys({ ...showApiKeys, anthropic: !showApiKeys.anthropic })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.anthropic ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* OpenAI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                OpenAI API Key
              </label>
              <div className="flex items-center gap-2">
                {apiKeysStatus.openai_configured ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Configurée
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Non configurée</span>
                )}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Obtenir une clé
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type={showApiKeys.openai ? 'text' : 'password'}
                value={apiKeys.openai}
                onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="sk-proj-xxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowApiKeys({ ...showApiKeys, openai: !showApiKeys.openai })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.openai ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Ollama */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Ollama URL (optionnel)
              </label>
              <div className="flex items-center gap-2">
                {apiKeysStatus.ollama_configured ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Configurée
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Non configurée</span>
                )}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Installer Ollama
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <input
              type="text"
              value={apiKeys.ollama}
              onChange={(e) => setApiKeys({ ...apiKeys, ollama: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="http://localhost:11434"
            />
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveApiKeys}
            disabled={isSavingKeys || (!apiKeys.anthropic && !apiKeys.openai && !apiKeys.ollama)}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSavingKeys ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Sauvegarder les clés API
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            🔒 Les clés sont chiffrées (AES-256) et jamais exposées. Laissez vide pour conserver les clés actuelles.
          </p>
        </div>

        {/* Model Parameters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Paramètres du modèle</h3>

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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Seuils de confiance</h3>

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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Application automatique</h3>

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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Budget et optimisation</h3>

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
  )
}
