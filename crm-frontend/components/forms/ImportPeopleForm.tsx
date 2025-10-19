'use client'

import React, { useState } from 'react'
import { Button, Alert } from '@/components/shared'
import { useToast } from '@/components/ui/Toast'

interface ImportPeopleFormProps {
  onSuccess?: () => void
}

interface ImportResult {
  total: number
  created: number[]
  failed: number
  errors: Array<{ index: number; row: number; error: string }>
}

export function ImportPeopleForm({ onSuccess }: ImportPeopleFormProps) {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
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
    const people = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      if (values.every((v) => !v)) continue // Skip empty lines

      const person: Record<string, any> = {}
      headers.forEach((header, idx) => {
        if (values[idx]) person[header] = values[idx]
      })
      people.push(person)
    }

    return people
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvContent.trim()) {
      showToast({ type: 'error', title: 'Erreur', message: 'Veuillez sélectionner un fichier CSV' })
      return
    }

    setIsLoading(true)
    try {
      const people = parseCSV(csvContent)
      if (people.length === 0) {
        showToast({ type: 'error', title: 'Erreur', message: 'Aucune personne à importer' })
        return
      }

      const response = await fetch('/api/v1/imports/people/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(people),
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
          message: `${importResult.created.length} personne(s) importée(s) avec succès`,
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Fichier CSV</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
            id="csv-input"
          />
          <label htmlFor="csv-input" className="cursor-pointer">
            <div className="text-sm text-gray-600">
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
          CSV attendu: first_name, last_name, personal_email, personal_phone, role, linkedin_url, notes, country_code, language
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
              <div className="text-xs font-medium text-gray-700 mb-2">Erreurs:</div>
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-gray-600 mb-1">
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