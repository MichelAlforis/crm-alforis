// hooks/useImportInvestors.ts
// ============= IMPORT INVESTISSEURS HOOK =============

'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { InvestorCreate } from '@/lib/types'

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; error: string }[]
  created: number[]
}

export interface ImportedInvestor extends InvestorCreate {
  rowNumber: number
}

export function useImportInvestors() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<ImportResult>()

  /**
   * Parse Excel data et retourne les investisseurs
   */
  const parseExcelData = (data: any[]): { investors: ImportedInvestor[]; errors: { row: number; error: string }[] } => {
    const investors: ImportedInvestor[] = []
    const errors: { row: number; error: string }[] = []

    data.forEach((row, index) => {
      try {
        const rowNumber = index + 2 // +1 pour header, +1 pour index 0

        // Récupérer les colonnes (flexible sur les noms)
        const nom = row['Nom'] || row['nom'] || row['Name'] || row['name']
        const email = row['Email'] || row['email']
        const mainPhone = row['Téléphone'] || row['telephone'] || row['Phone'] || row['phone']
        const company = row['Société'] || row['societe'] || row['Company'] || row['company']
        const industry = row['Secteur'] || row['secteur'] || row['Industry'] || row['industry']
        const pipelineStage = row['Pipeline'] || row['pipeline'] || 'prospect_froid'
        const clientType = row['Type Client'] || row['type_client'] || row['Client Type']
        const notes = row['Notes'] || row['notes']

        // Validation
        if (!nom || nom.toString().trim() === '') {
          errors.push({ row: rowNumber, error: 'Nom requis' })
          return
        }

        // Normaliser les données
        const investor: ImportedInvestor = {
          rowNumber,
          name: nom.toString().trim(),
          email: email ? email.toString().trim() : undefined,
          main_phone: mainPhone ? mainPhone.toString().trim() : undefined,
          company: company ? company.toString().trim() : undefined,
          industry: industry ? industry.toString().trim() : undefined,
          pipeline_stage: normalizePipelineStage(pipelineStage),
          client_type: normalizeClientType(clientType),
          notes: notes ? notes.toString().trim() : undefined,
        }

        investors.push(investor)
      } catch (err: any) {
        errors.push({ row: index + 2, error: err.message })
      }
    })

    return { investors, errors }
  }

  /**
   * Normaliser le pipeline_stage
   */
  const normalizePipelineStage = (value: any): string => {
    if (!value) return 'prospect_froid'
    const str = value.toString().toLowerCase().replace(/ /g, '_')
    const valid = ['prospect_froid', 'prospect_tiede', 'prospect_chaud', 'en_negociation', 'client', 'inactif']
    return valid.includes(str) ? str : 'prospect_froid'
  }

  /**
   * Normaliser le client_type
   */
  const normalizeClientType = (value: any): string | undefined => {
    if (!value) return undefined
    const str = value.toString().toLowerCase().replace(/ /g, '_')
    const valid = ['cgpi', 'wholesale', 'institutionnel', 'autre']
    return valid.includes(str) ? str : undefined
  }

  /**
   * Importer les investisseurs
   */
  const importInvestors = async (investors: ImportedInvestor[]) => {
    setIsLoading(true)
    setError(undefined)
    setResult(undefined)

    try {
      const result: ImportResult = {
        total: investors.length,
        success: 0,
        failed: 0,
        errors: [],
        created: [],
      }

      // Créer les investisseurs un par un
      for (const investor of investors) {
        try {
          const created = await apiClient.createInvestor({
            name: investor.name,
            email: investor.email,
            main_phone: investor.main_phone,
            company: investor.company,
            industry: investor.industry,
            pipeline_stage: investor.pipeline_stage as any,
            client_type: investor.client_type as any,
            notes: investor.notes,
          })

          result.success++
          result.created.push(created.id)
        } catch (err: any) {
          result.failed++
          result.errors.push({
            row: investor.rowNumber,
            error: err.detail || err.message || 'Erreur inconnue',
          })
        }
      }

      setResult(result)
      setIsLoading(false)
      return result
    } catch (err: any) {
      const errorMsg = err.detail || err.message || 'Erreur lors de l\'import'
      setError(errorMsg)
      setIsLoading(false)
      throw err
    }
  }

  return {
    isLoading,
    error,
    result,
    parseExcelData,
    importInvestors,
  }
}
