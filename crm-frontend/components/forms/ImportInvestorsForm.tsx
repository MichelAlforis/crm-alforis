// components/forms/ImportInvestorsForm.tsx
// ============= IMPORT INVESTISSEURS FORM =============

'use client'

import React, { useRef, useState } from 'react'
import { Button, Alert, Table, Card } from '@/components/shared'
import { useImportInvestors, ImportedInvestor } from '@/hooks/useImportInvestors'

interface ImportInvestorsFormProps {
  onSuccess?: (count: number) => void
}

export function ImportInvestorsForm({ onSuccess }: ImportInvestorsFormProps) {
  const { parseExcelData, importInvestors, isLoading, error, result } = useImportInvestors()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportedInvestor[]>([])
  const [previewErrors, setPreviewErrors] = useState<{ row: number; error: string }[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /**
   * Lire le fichier Excel/CSV
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Lire le fichier
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as string
        
        // Parser le CSV (Excel peut être converti en CSV)
        const rows = parseCSV(data)
        
        if (rows.length === 0) {
          setPreviewErrors([{ row: 0, error: 'Aucune donnée trouvée dans le fichier' }])
          return
        }

        // Parser avec le hook
        const { investors, errors } = parseExcelData(rows)

        setPreview(investors)
        setPreviewErrors(errors)
        setStep('preview')
      } catch (err: any) {
        alert('Erreur lors de la lecture du fichier: ' + err.message)
      }
    }
    reader.readAsText(selectedFile)
  }

  /**
   * Parser simple du CSV
   * Compatible avec Excel sauvegardé en CSV
   */
  const parseCSV = (csv: string): any[] => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    // Header
    const headers = lines[0].split(',').map(h => h.trim())

    // Rows
    const rows: any[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      rows.push(row)
    }

    return rows
  }

  /**
   * Importer les données
   */
  const handleImport = async () => {
    try {
      const res = await importInvestors(preview)
      if (res.success > 0) {
        onSuccess?.(res.success)
      }
      setStep('result')
    } catch (err) {
      console.error(err)
    }
  }

  const previewColumns = [
    { header: 'Ligne', accessor: 'rowNumber' },
    { header: 'Nom', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Type', accessor: 'client_type' },
  ]

  return (
    <div className="space-y-6">
      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-bleu rounded-lg p-8 text-center">
            <div className="mb-4">📄</div>
            <h3 className="text-lg font-medium mb-2">Importer des investisseurs</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez un fichier Excel (.xlsx, .xls) ou CSV
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choisir un fichier
            </Button>

            {file && (
              <p className="text-sm text-gray-700 mt-4">
                ✅ Fichier sélectionné: <strong>{file.name}</strong>
              </p>
            )}
          </div>

          <Card className="bg-blue-50 border border-blue-200">
            <p className="text-sm text-gray-700 mb-3 font-medium">📋 Format attendu:</p>
            <p className="text-xs text-gray-600">
              Colonnes attendues (dans n'importe quel ordre):
              <br />
              <strong>Nom</strong> (requis), Email, Téléphone, Secteur, Société, Pipeline, Type Client
            </p>
            <br />
            <p className="text-xs text-gray-600 mb-2">
              <strong>Valeurs Pipeline:</strong> prospect_froid, prospect_tiede, prospect_chaud, en_negociation, client, inactif
            </p>
            <p className="text-xs text-gray-600">
              <strong>Valeurs Type Client:</strong> cgpi, wholesale, institutionnel, autre
            </p>
          </Card>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Vérifier les données ({preview.length} investisseurs)
            </h3>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              ← Retour
            </Button>
          </div>

          {previewErrors.length > 0 && (
            <Alert
              type="warning"
              message={`⚠️ ${previewErrors.length} erreur(s) de validation`}
            />
          )}

          {previewErrors.length > 0 && (
            <Card className="bg-red-50 border border-red-200">
              <p className="font-medium text-sm mb-3">Erreurs:</p>
              <ul className="text-xs text-red-800 space-y-1">
                {previewErrors.map((err, i) => (
                  <li key={i}>
                    Ligne {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {preview.length > 0 && (
            <Card>
              <Table
                columns={previewColumns}
                data={preview}
                isLoading={false}
                isEmpty={false}
              />
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleImport}
              isLoading={isLoading}
              disabled={preview.length === 0}
            >
              ✅ Importer ({preview.length} investisseurs)
            </Button>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULT */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Résultat de l'import</h3>

          {error && <Alert type="error" message={error} />}

          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center bg-green-50">
              <div className="text-2xl font-bold text-vert">{result.success}</div>
              <p className="text-sm text-gray-600">Créés avec succès</p>
            </Card>
            <Card className="text-center bg-blue-50">
              <div className="text-2xl font-bold text-bleu">{result.total}</div>
              <p className="text-sm text-gray-600">Total traités</p>
            </Card>
            <Card className="text-center bg-red-50">
              <div className="text-2xl font-bold text-rouge">{result.failed}</div>
              <p className="text-sm text-gray-600">Erreurs</p>
            </Card>
          </div>

          {result.errors.length > 0 && (
            <Card className="bg-red-50 border border-red-200">
              <p className="font-medium text-sm mb-3">Erreurs d'import:</p>
              <ul className="text-xs text-red-800 space-y-1">
                {result.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>
                    Ligne {err.row}: {err.error}
                  </li>
                ))}
                {result.errors.length > 10 && (
                  <li>... et {result.errors.length - 10} autres erreurs</li>
                )}
              </ul>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setStep('upload')
                setFile(null)
                setPreview([])
                setPreviewErrors([])
              }}
            >
              ✅ Terminer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
