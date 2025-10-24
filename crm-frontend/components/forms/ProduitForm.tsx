// components/forms/ProduitForm.tsx
// ============= PRODUIT FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Produit, ProduitCreate, ProduitType, ProduitStatus } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { HelpTooltip } from '@/components/help/HelpTooltip'

interface ProduitFormProps {
  initialData?: Produit
  onSubmit: (data: ProduitCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

const TYPE_OPTIONS: { value: ProduitType; label: string }[] = [
  { value: 'OPCVM', label: 'OPCVM (Fonds)' },
  { value: 'ETF', label: 'ETF (Trackers)' },
  { value: 'SCPI', label: 'SCPI (Immobilier)' },
  { value: 'ASSURANCE_VIE', label: 'Assurance Vie' },
  { value: 'PER', label: 'PER (Plan Épargne Retraite)' },
  { value: 'AUTRE', label: 'Autre' },
]

const STATUS_OPTIONS: { value: ProduitStatus; label: string }[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
  { value: 'en_attente', label: 'En attente' },
]

export function ProduitForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: ProduitFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProduitCreate>({
    defaultValues: {
      ...initialData,
      type: initialData?.type ?? 'AUTRE',
      status: initialData?.status ?? 'actif',
    },
    mode: 'onBlur',
  })

  const selectedType = watch('type')

  const handleFormSubmit = async (data: ProduitCreate) => {
    try {
      await onSubmit(data)
      showToast({
        type: 'success',
        title: initialData ? 'Produit mis à jour' : 'Produit créé',
        message: initialData
          ? 'Les informations du produit ont été enregistrées.'
          : 'Le nouveau produit a été ajouté avec succès.',
      })
    } catch (err: any) {
      const message =
        err?.detail || err?.message || "Impossible d'enregistrer le produit."
      showToast({
        type: 'error',
        title: 'Erreur',
        message,
      })
      throw err
    }
  }

  const showIsinField = ['OPCVM', 'ETF', 'SCPI'].includes(selectedType)

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <Input
        label="Nom du produit *"
        {...register('name', { required: 'Nom requis' })}
        error={errors.name?.message}
        placeholder="ex: Fonds ABC Euro, Tracker World"
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Type de produit *
          </label>
          <HelpTooltip
            content="Catégorie du produit financier : OPCVM (fonds d'investissement), ETF (trackers), SCPI (immobilier pierre-papier), Assurance-vie, PER (épargne retraite), etc."
            learnMoreLink="/dashboard/help/guides/produits#types"
            size="sm"
          />
        </div>
        <Select
          {...register('type', { required: 'Type requis' })}
          error={errors.type?.message}
        >
          <option value="">-- Sélectionner --</option>
          {TYPE_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>

      {showIsinField && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Code ISIN
            </label>
            <HelpTooltip
              content="Identifiant international unique du produit financier. Format : 2 lettres pays + 9 caractères alphanumériques + 1 chiffre de contrôle. Exemple : FR0010315770 (Carmignac Patrimoine)."
              learnMoreLink="/dashboard/help/guides/produits#isin"
              size="sm"
            />
          </div>
          <Input
            {...register('isin_code', {
              pattern: {
                value: /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/,
                message: 'Format ISIN invalide (ex: FR0010315770)',
              },
            })}
            error={errors.isin_code?.message}
            placeholder="ex: FR0010315770"
            maxLength={12}
          />
        </div>
      )}

      <Select
        label="Statut *"
        {...register('status', { required: 'Statut requis' })}
        error={errors.status?.message}
      >
        <option value="">-- Sélectionner --</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </Select>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Décrivez le produit, ses caractéristiques principales..."
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="pt-2 px-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-semibold">ℹ️ Information</p>
        <p className="mt-1">
          Un produit peut être créé sans être associé à un mandat. Pour l'associer à un ou
          plusieurs mandats, utilisez la page de détail du produit après sa création.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading} variant="primary">
          {isLoading ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
