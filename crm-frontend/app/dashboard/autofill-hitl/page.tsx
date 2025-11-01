'use client'

/**
 * HITL v2 - Human-In-The-Loop Interface
 * Validation en masse des suggestions autofill avec web enrichment
 *
 * Features:
 * - 🔍 Filtres avancés (status, confidence, web_enriched)
 * - ✅ Bulk actions (approve/reject 10-50 à la fois)
 * - 🌐 Badge "Enrichi web" avec confidence score
 * - 📊 Diff viewer avant/après
 * - 🔄 Enrichissement manuel
 * - 📜 Audit trail (RGPD)
 */

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import {
  CheckCircle,
  XCircle,
  Globe,
  Filter,
  RefreshCw,
  History,
  Sparkles,
  Ban
} from 'lucide-react'

interface Suggestion {
  id: number
  source_email_id?: number
  target_type: string
  target_id?: number
  suggested_data: Record<string, any>
  confidence_score: number
  model_used?: string
  status: string
  web_enriched: boolean
  enrichment_confidence?: number
  enrichment_source?: string
  enriched_at?: string
  created_at: string
  updated_at?: string
}

interface Filters {
  status?: string
  web_enriched?: boolean
  min_confidence?: number
  enrichment_source?: string
}

export default function AutofillHITLPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<Filters>({})
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [blacklistingEmail, setBlacklistingEmail] = useState<string | null>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

  // Fetch suggestions
  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.web_enriched !== undefined) params.append('web_enriched', String(filters.web_enriched))
      if (filters.min_confidence) params.append('min_confidence', String(filters.min_confidence))
      if (filters.enrichment_source) params.append('enrichment_source', filters.enrichment_source)

      const res = await fetch(`${API_BASE}/autofill-hitl/suggestions?${params}`, {
        headers: {
          'Authorization': `Bearer ${storage.get(AUTH_STORAGE_KEYS.LEGACY_TOKEN)}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [filters])

  // Bulk approve
  const bulkApprove = async () => {
    if (selected.size === 0) return

    try {
      const res = await fetch(`${API_BASE}/autofill-hitl/bulk-approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storage.get(AUTH_STORAGE_KEYS.LEGACY_TOKEN)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          suggestion_ids: Array.from(selected)
        })
      })

      if (res.ok) {
        const result = await res.json()
        alert(`✅ ${result.success} validées, ${result.failed} échecs`)
        setSelected(new Set())
        fetchSuggestions()
      }
    } catch (error) {
      console.error('Bulk approve failed:', error)
    }
  }

  // Bulk reject
  const bulkReject = async () => {
    if (selected.size === 0) return

    try {
      const res = await fetch(`${API_BASE}/autofill-hitl/bulk-reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storage.get(AUTH_STORAGE_KEYS.LEGACY_TOKEN)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          suggestion_ids: Array.from(selected)
        })
      })

      if (res.ok) {
        const result = await res.json()
        alert(`❌ ${result.success} rejetées, ${result.failed} échecs`)
        setSelected(new Set())
        fetchSuggestions()
      }
    } catch (error) {
      console.error('Bulk reject failed:', error)
    }
  }

  // Blacklist sender
  const blacklistSender = async (email: string) => {
    if (!email) {
      alert('❌ Email manquant')
      return
    }

    const confirmed = confirm(
      `⛔ Bloquer définitivement l'expéditeur "${email}" ?\n\n` +
      `Cela va :\n` +
      `• Ajouter ${email} à la blacklist\n` +
      `• Supprimer toutes les suggestions existantes de cet expéditeur\n` +
      `• Empêcher la création de nouvelles suggestions\n\n` +
      `Cette action est irréversible.`
    )

    if (!confirmed) return

    setBlacklistingEmail(email)

    try {
      const res = await fetch(`${API_BASE}/autofill-hitl/blacklist-sender`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storage.get(AUTH_STORAGE_KEYS.LEGACY_TOKEN)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          pattern_type: 'email',
          reason: 'Bloqué via interface HITL',
          delete_existing_suggestions: true
        })
      })

      if (res.ok) {
        const result = await res.json()
        alert(
          `✅ Expéditeur bloqué avec succès!\n\n` +
          `• Pattern: ${result.pattern}\n` +
          `• Suggestions supprimées: ${result.suggestions_deleted}`
        )
        fetchSuggestions()
      } else {
        const error = await res.json()
        alert(`❌ Erreur: ${error.detail || 'Échec du blocage'}`)
      }
    } catch (error) {
      console.error('Blacklist failed:', error)
      alert('❌ Erreur lors du blocage de l\'expéditeur')
    } finally {
      setBlacklistingEmail(null)
    }
  }

  // Toggle selection
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  // Select all
  const toggleSelectAll = () => {
    if (selected.size === suggestions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(suggestions.map(s => s.id)))
    }
  }

  // Confidence color
  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100'
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <PageContainer width="wide">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-purple-600" />
          HITL v2 - Validation Suggestions
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Validez en masse les suggestions d'autofill avec enrichissement web
        </p>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="font-medium text-blue-900">
            {selected.size} suggestion{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={bulkApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Valider ({selected.size})
            </button>
            <button
              onClick={bulkReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Rejeter ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:bg-slate-800 flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
        <button
          onClick={fetchSuggestions}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:bg-slate-800 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              >
                <option value="">Tous</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
                <option value="applied">Appliquées</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Enrichi web
              </label>
              <select
                value={filters.web_enriched === undefined ? '' : String(filters.web_enriched)}
                onChange={(e) => setFilters({
                  ...filters,
                  web_enriched: e.target.value === '' ? undefined : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              >
                <option value="">Tous</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Confidence min
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={filters.min_confidence || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  min_confidence: e.target.value ? parseFloat(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
                placeholder="0.0 - 1.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Source enrichment
              </label>
              <select
                value={filters.enrichment_source || ''}
                onChange={(e) => setFilters({ ...filters, enrichment_source: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              >
                <option value="">Toutes</option>
                <option value="serpapi">SerpAPI</option>
                <option value="brave">Brave</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === suggestions.length && suggestions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">Données</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">Confidence</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : suggestions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Aucune suggestion trouvée
                </td>
              </tr>
            ) : (
              suggestions.map((suggestion) => (
                <tr key={suggestion.id} className="hover:bg-gray-50 dark:bg-slate-800">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(suggestion.id)}
                      onChange={() => toggleSelect(suggestion.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{suggestion.target_type}</span>
                      {suggestion.web_enriched && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          <Globe className="w-3 h-3" />
                          Enrichi
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-slate-100">
                      {Object.entries(suggestion.suggested_data).slice(0, 3).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence_score)}`}>
                        AI: {(suggestion.confidence_score * 100).toFixed(0)}%
                      </span>
                      {suggestion.web_enriched && suggestion.enrichment_confidence && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.enrichment_confidence)}`}>
                          Web: {(suggestion.enrichment_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      suggestion.status === 'approved' ? 'bg-green-100 text-green-700' :
                      suggestion.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      suggestion.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {suggestion.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Approuver"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Rejeter"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Enrichir"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-800 rounded"
                        title="Historique"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          // Get email from source
                          if (!suggestion.source_email_id) {
                            const email = prompt('Email de l\'expéditeur à bloquer:')
                            if (email) {
                              await blacklistSender(email)
                            }
                          } else {
                            // TODO: Fetch email.sender_email from API
                            const email = prompt('Email de l\'expéditeur à bloquer:')
                            if (email) {
                              await blacklistSender(email)
                            }
                          }
                        }}
                        disabled={blacklistingEmail !== null}
                        className="p-1 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                        title="Bloquer cet expéditeur"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="mt-4 text-sm text-gray-600 dark:text-slate-400">
        {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} •
        {' '}{suggestions.filter(s => s.web_enriched).length} enrichie{suggestions.filter(s => s.web_enriched).length > 1 ? 's' : ''} web
      </div>
    </PageContainer>
  )
}
