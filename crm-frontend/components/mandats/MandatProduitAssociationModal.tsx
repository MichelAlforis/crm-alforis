'use client'

import React, { useState, useCallback } from 'react'
import { Alert, Input } from '@/components/shared'
import { ModalForm } from '@/components/shared/Modal'
import { SearchableSelect } from '@/components/shared'
import { useFormToast } from '@/hooks/useFormToast'
import { usePaginatedOptions, type PaginatedFetcherParams } from '@/hooks/usePaginatedOptions'
import { useAssociateProduitToMandat } from '@/hooks/useProduits'
import { apiClient } from '@/lib/api'
import type { Produit, MandatStatus } from '@/lib/types'

interface MandatProduitAssociationModalProps {
  isOpen: boolean
  onClose: () => void
  mandatId: number
  mandatStatus: MandatStatus
  onSuccess: () => void
}

const MANDAT_ACTIF_STATUSES: MandatStatus[] = ['SIGNE', 'ACTIF']

export default function MandatProduitAssociationModal({
  isOpen,
  onClose,
  mandatId,
  mandatStatus,
  onSuccess,
}: MandatProduitAssociationModalProps) {
  const toast = useFormToast({ entityName: 'Association', gender: 'f' })
  const associateMutation = useAssociateProduitToMandat()

  const [selectedProduitId, setSelectedProduitId] = useState<number | null>(null)
  const [allocationPourcentage, setAllocationPourcentage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const isMandatActif = MANDAT_ACTIF_STATUSES.includes(mandatStatus)

  // Fetch produits avec recherche
  const fetchProduitOptions = useCallback(
    ({ query, skip, limit }: PaginatedFetcherParams) => {
      if (query) {
        return apiClient.searchProduits(query, skip, limit)
      }
      return apiClient.getProduits({
        skip,
        limit,
        status: 'ACTIF', // Only show active products
      })
    },
    []
  )

  const mapProduitToOption = useCallback(
    (produit: Produit) => ({
      id: produit.id,
      label: produit.name,
      sublabel: produit.isin_code
        ? `${produit.type} • ${produit.isin_code}`
        : produit.type,
    }),
    []
  )

  const {
    options: produitOptions,
    isLoading: isLoadingProduits,
    isLoadingMore: isLoadingMoreProduits,
    hasMore: hasMoreProduits,
    search: searchProduits,
    loadMore: loadMoreProduits,
  } = usePaginatedOptions<Produit>({
    fetcher: fetchProduitOptions,
    mapItem: mapProduitToOption,
    limit: 25,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation: Mandat must be active
    if (!isMandatActif) {
      setError('Le mandat doit être signé ou actif pour associer des produits.')
      toast.error('Changez le statut du mandat à "Signé" ou "Actif" avant d\'associer des produits.')
      return
    }

    // Validation: Produit must be selected
    if (!selectedProduitId) {
      setError('Veuillez sélectionner un produit.')
      toast.warning('Produit requis', 'Sélectionnez un produit à associer au mandat.')
      return
    }

    // Validation: Allocation percentage (optional, but if provided must be valid)
    let allocation: number | undefined
    if (allocationPourcentage.trim()) {
      const parsed = parseFloat(allocationPourcentage)
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        setError('L\'allocation doit être un nombre entre 0 et 100.')
        toast.warning('Allocation invalide', 'Entrez un pourcentage entre 0 et 100.')
        return
      }
      allocation = parsed
    }

    try {
      await associateMutation.mutateAsync({
        mandat_id: mandatId,
        produit_id: selectedProduitId,
        allocation_pourcentage: allocation,
      })

      toast.success('Produit associé', 'Le produit a été ajouté au mandat avec succès.')

      setSelectedProduitId(null)
      setAllocationPourcentage('')
      setError(null)
      onSuccess()
      onClose()
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Impossible d\'associer le produit au mandat.'
      setError(errorMessage)
      toast.error(err)
    }
  }

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Associer un produit au mandat"
      onSubmit={handleSubmit}
      submitLabel="Associer"
      isLoading={associateMutation.isPending}
      submitDisabled={!isMandatActif || !selectedProduitId}
      error={error}
      size="md"
    >
      <div className="space-y-4">
        {!isMandatActif && (
          <Alert
            type="warning"
            message={`Le mandat doit avoir le statut "Signé" ou "Actif" pour associer des produits. Statut actuel: ${mandatStatus}`}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Produit <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={produitOptions}
            value={selectedProduitId}
            onChange={(value) => setSelectedProduitId(value)}
            placeholder="Rechercher un produit..."
            onSearch={searchProduits}
            onLoadMore={loadMoreProduits}
            hasMore={hasMoreProduits}
            isLoading={isLoadingProduits}
            isLoadingMore={isLoadingMoreProduits}
            disabled={!isMandatActif}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Seuls les produits actifs sont affichés
          </p>
        </div>

        <div>
          <Input
            label="Allocation (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={allocationPourcentage}
            onChange={(e) => setAllocationPourcentage(e.target.value)}
            placeholder="ex: 25.5"
            disabled={!isMandatActif}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Optionnel - Pourcentage d'allocation du produit dans le mandat (0-100%)
          </p>
        </div>

        <div className="pt-2 px-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold">ℹ️ Information</p>
          <ul className="mt-1 ml-4 list-disc space-y-1">
            <li>L'association permet de lier des produits à un mandat de distribution</li>
            <li>L'allocation est optionnelle et sert à indiquer le poids du produit</li>
            <li>La somme des allocations devrait idéalement faire 100%</li>
          </ul>
        </div>
      </div>
    </ModalForm>
  )
}
