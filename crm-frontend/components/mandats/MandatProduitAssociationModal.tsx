'use client'

import React, { useState, useCallback } from 'react'
import { Modal, Button, Alert, Input } from '@/components/shared'
import { SearchableSelect } from '@/components/shared'
import { useToast } from '@/components/ui/Toast'
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
  const { showToast } = useToast()
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

  const handleReset = () => {
    setSelectedProduitId(null)
    setAllocationPourcentage('')
    setError(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation: Mandat must be active
    if (!isMandatActif) {
      setError('Le mandat doit être signé ou actif pour associer des produits.')
      showToast({
        type: 'error',
        title: 'Mandat non actif',
        message: 'Changez le statut du mandat à "Signé" ou "Actif" avant d\'associer des produits.',
      })
      return
    }

    // Validation: Produit must be selected
    if (!selectedProduitId) {
      setError('Veuillez sélectionner un produit.')
      showToast({
        type: 'warning',
        title: 'Produit requis',
        message: 'Sélectionnez un produit à associer au mandat.',
      })
      return
    }

    // Validation: Allocation percentage (optional, but if provided must be valid)
    let allocation: number | undefined
    if (allocationPourcentage.trim()) {
      const parsed = parseFloat(allocationPourcentage)
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        setError('L\'allocation doit être un nombre entre 0 et 100.')
        showToast({
          type: 'warning',
          title: 'Allocation invalide',
          message: 'Entrez un pourcentage entre 0 et 100.',
        })
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

      showToast({
        type: 'success',
        title: 'Produit associé',
        message: 'Le produit a été ajouté au mandat avec succès.',
      })

      handleReset()
      onSuccess()
      onClose()
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Impossible d\'associer le produit au mandat.'
      setError(errorMessage)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: errorMessage,
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Associer un produit au mandat"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={associateMutation.isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={associateMutation.isPending}
            disabled={!isMandatActif}
          >
            Associer
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {!isMandatActif && (
          <Alert
            type="warning"
            message={`Le mandat doit avoir le statut "Signé" ou "Actif" pour associer des produits. Statut actuel: ${mandatStatus}`}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <p className="mt-1 text-xs text-gray-500">
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
          <p className="mt-1 text-xs text-gray-500">
            Optionnel - Pourcentage d'allocation du produit dans le mandat (0-100%)
          </p>
        </div>

        <div className="pt-2 px-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <p className="font-semibold">ℹ️ Information</p>
          <ul className="mt-1 ml-4 list-disc space-y-1">
            <li>L'association permet de lier des produits à un mandat de distribution</li>
            <li>L'allocation est optionnelle et sert à indiquer le poids du produit</li>
            <li>La somme des allocations devrait idéalement faire 100%</li>
          </ul>
        </div>
      </form>
    </Modal>
  )
}
