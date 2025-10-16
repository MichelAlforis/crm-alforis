// hooks/useImportFournisseurs.ts
// ============= IMPORT FOURNISSEURS HOOK =============

'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'
import type { FournisseurCreate } from '@/lib/types'

export interface ImportedFournisseur {
  rowNumber: number
  name: string
  email?: string
  phone?: string
  sector?: string
  company?: string
  pipeline?: 'prospect_froid' | 'prospect_tiede' | 'prospect_chaud' | 'en_negociation' | 'actif' | 'inactif'
  fournisseur_type?: 'societe_de_gestion' | 'legal' | 'it' | 'marketing' | 'autre'
  country?: string
  notes?: string
}

type PreviewRow = Record<string, string>

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; error: string }[]
  created: number[]
}

interface ParseResult {
  fournisseurs: ImportedFournisseur[]
  errors: { row: number; error: string }[]
}

/**
 * Hook d’import pour Fournisseurs — miroir de useImportInvestors (création unitaire)
 * Expose: parseExcelData, importFournisseurs, isLoading, error, result
 */
export function useImportFournisseurs() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  /** Normalise un objet ligne en accès case-insensitive */
  const norm = (row: PreviewRow) => {
    const map: Record<string, string> = {}
    Object.keys(row).forEach((k) => (map[k.trim().toLowerCase()] = (row[k] ?? '').toString().trim()))
    return (key: string, alts: string[] = []) => {
      const keys = [key, ...alts].map((s) => s.toLowerCase())
      for (const k of keys) {
        if (k in map) return map[k]
      }
      return ''
    }
  }

  /**
   * Parse & validation depuis les lignes déjà lues (CSV → objets)
   * Les en-têtes acceptent plusieurs variantes FR/EN.
   */
  const parseExcelData = (rows: PreviewRow[]): ParseResult => {
    const fournisseurs: ImportedFournisseur[] = []
    const errors: { row: number; error: string }[] = []

    rows.forEach((raw, idx) => {
      const get = norm(raw)

      const name = get('nom', ['name'])
      const email = get('email', ['e-mail', 'mail'])
      const phone = get('téléphone', ['telephone', 'phone', 'tel'])
      const sector = get('secteur', ['sector', 'industry'])
      const company = get('société', ['societe', 'company', 'organisation', 'organization'])
      const pipeline = (get('pipeline') || 'prospect_froid') as ImportedFournisseur['pipeline']
      const fournisseur_type = (get('type fournisseur', ['type_fournisseur', 'fournisseur_type', 'type'])) as ImportedFournisseur['fournisseur_type']
      const country = get('pays', ['country'])
      const notes = get('notes', ['note', 'commentaires', 'comments'])

      const rowNumber = idx + 2 // +2 pour compter l’entête CSV

      // Règle minimale : Nom requis
      if (!name) {
        errors.push({ row: rowNumber, error: 'Colonne "Nom" manquante ou vide' })
        return
      }

      fournisseurs.push({
        rowNumber,
        name,
        email,
        phone,
        sector,
        company,
        pipeline: (pipeline || 'prospect_froid') as ImportedFournisseur['pipeline'],
        fournisseur_type: (fournisseur_type || 'autre') as ImportedFournisseur['fournisseur_type'],
        country,
        notes,
      })
    })

    return { fournisseurs, errors }
  }

  /**
   * Import unitaire (comme useImportInvestors) → évite le 404 du /fournisseurs/bulk
   * Utilise apiClient.createFournisseur pour chaque ligne.
   */
  const importFournisseurs = async (data: ImportedFournisseur[]): Promise<ImportResult> => {
    setIsLoading(true)
    setError(null)

    const agg: ImportResult = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    }

    try {
      for (const f of data) {
        try {
          const payload: FournisseurCreate = {
            name: f.name,
            email: f.email,
            phone: f.phone,
            sector: f.sector,
            company: f.company,
            pipeline: f.pipeline || 'prospect_froid',
            fournisseur_type: f.fournisseur_type || 'autre',
            country: f.country,
            notes: f.notes,
          }

          const created = await apiClient.createFournisseur(payload)
          agg.success += 1
          // @ts-ignore: id selon ton modèle (number)
          if (created?.id != null) agg.created.push(created.id as number)
        } catch (e: any) {
          agg.failed += 1
          agg.errors.push({
            row: f.rowNumber,
            error: e?.detail || e?.message || 'Erreur inconnue',
          })
        }
      }

      setResult(agg)
      return agg
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Erreur lors de l’import'
      setError(msg)
      setResult(agg) // on conserve les succès/échecs partiels accumulés
      return agg
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    result,
    parseExcelData,
    importFournisseurs,
  }
}
