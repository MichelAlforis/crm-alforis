'use client'

import React, { useState } from 'react'
import { Button, Alert, Select } from '@/components/shared'
import { useToast } from '@/components/ui/Toast'

interface ImportOrganisationsFormProps {
  onSuccess?: () => void
}

interface ImportResult {
  total: number
  created: number[]
  failed: number
  errors: Array<{ index: number; row: number; error: string }>
  type: string
}

export function ImportOrganisationsForm({ onSuccess }: ImportOrganisationsFormProps) {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [orgType, setOrgType] = useState<string>('client')
  const [csvContent, setCsvContent] = useState<string>('')
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string)
      setResult(null)
    }
    reader.readAsText(file)
  }

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) throw new Error('Le CSV doit contenir au moins un en-tête et une ligne de données')

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const organisations = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      if (values.every((v) => !v)) continue // Skip empty lines

      const org: Record<string, any> = {}
      headers.forEach((header, idx) => {
        if (values[idx]) org[header] = values[idx]
      })
      organisations.push(org)
    }

    return organisations
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvContent.trim()) {
      showToast({ type: 'error', title: 'Erreur', message: 'Veuillez sélectionner un fichier CSV' })
      return
    }

    setIsLoading(true)
    try {
      const organisations = parseCSV(csvContent)
      if (organisations.length === 0) {
        showToast({ type: 'error', title: 'Erreur', message: 'Aucune organisation à importer' })
        return
      }

      const response = await fetch(`/api/v1/imports/organisations/bulk?type_org=${orgType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organisations),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de l\'import')
      }

      const importResult = (await response.json()) as ImportResult
      setResult(importResult)

      if (importResult.failed === 0) {
        showToast({
          type: 'success',
          title: 'Import réussi',
          message: `${importResult.created.length} organisation(s) importée(s) avec succès`,
        })
        setCsvContent('')
        setTimeout(() => onSuccess?.(), 1500)
      } else {
        showToast({
          type: 'warning',
          title: 'Import partiel',
          message: `${importResult.created.length} créées, ${importResult.failed} erreurs`,
        })
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'import',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Type d'organisation</label>
        <Select
          value={orgType}
          onChange={(e) => setOrgType(e.target.value)}
          options={[
            { value: 'client', label: 'Client' },
            { value: 'fournisseur', label: 'Fournisseur' },
            { value: 'distributeur', label: 'Distributeur' },
            { value: 'emetteur', label: 'Émetteur' },
            { value: 'autre', label: 'Autre' },
          ]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Fichier CSV</label>
        <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
            id="csv-input"
          />
          <label htmlFor="csv-input" className="cursor-pointer">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              {csvContent ? (
                <span className="text-green-600 font-medium">✓ Fichier sélectionné</span>
              ) : (
                <>
                  <span className="text-blue-600 font-medium">Cliquez pour sélectionner</span>
                  <span> ou glissez-déposez un fichier CSV</span>
                </>
              )}
            </div>
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          CSV attendu: name, email, website, country_code, language, phone, description, category, is_active
        </p>
      </div>

      {result && (
        <Alert
          type={result.failed === 0 ? 'success' : 'warning'}
          title={result.failed === 0 ? 'Import réussi' : 'Import partiel'}
          message={`Total: ${result.total} | Créées: ${result.created.length} | Erreurs: ${result.failed}`}
        >
          {result.errors.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">Erreurs:</div>
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-gray-600 dark:text-slate-400 mb-1">
                  Ligne {err.row}: {err.error}
                </div>
              ))}
            </div>
          )}
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isLoading || !csvContent.trim()}>
          {isLoading ? 'Import en cours...' : 'Importer'}
        </Button>
      </div>
    </form>
  )
}