// app/dashboard/mandats/[id]/page.tsx
// ============= MANDAT DETAIL PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from "@/lib/constants"
import { useMandat, useUpdateMandat, useDeleteMandat } from '@/hooks/useMandats'
import { useProduitsByMandat, useDeleteMandatProduitAssociation } from '@/hooks/useProduits'
import { useConfirm } from '@/hooks/useConfirm'
import { useEntityDetail } from '@/hooks/useEntityDetail'
import { Card, Button, Alert, Modal } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Eye, Trash2 } from 'lucide-react'
import { MandatForm } from '@/components/forms'
import { SkeletonCard } from '@/components/ui/Skeleton'
import MandatProduitAssociationModal from '@/components/mandats/MandatProduitAssociationModal'
import { useToast } from '@/components/ui/Toast'
import type { MandatDistributionUpdate } from '@/lib/types'
import { MANDAT_STATUS_LABELS, MANDAT_TYPE_LABELS } from "@/lib/enums/labels"

export default function MandatDetailPage() {
  const {
    entityId: mandatId,
    isEditModalOpen,
    setIsEditModalOpen,
    handleDeleteWithRedirect,
  } = useEntityDetail({ listRoute: ROUTES.CRM.MANDATS })

  const { data: mandat, isLoading, error, refetch } = useMandat(mandatId ?? 0)
  const { data: produits, refetch: refetchProduits } = useProduitsByMandat(mandatId ?? 0)
  const updateMutation = useUpdateMandat()
  const deleteMutation = useDeleteMandat()
  const deleteAssociationMutation = useDeleteMandatProduitAssociation()
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()

  const [isAssociationModalOpen, setIsAssociationModalOpen] = useState(false)

  const handleUpdate = async (data: MandatDistributionUpdate) => {
    if (!mandatId) return
    await updateMutation.mutateAsync({ id: mandatId, data })
    setIsEditModalOpen(false)
  }

  const handleDeleteClick = () => {
    if (!mandatId) return

    confirm({
      title: 'Supprimer ce mandat ?',
      message: 'Cette action est irréversible. Le mandat et toutes ses associations seront supprimés.',
      type: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await handleDeleteWithRedirect(async () => {
          await deleteMutation.mutateAsync(mandatId)
          showToast({
            type: 'success',
            title: 'Mandat supprimé',
          })
        })
      },
    })
  }

  const handleDeleteAssociationClick = (associationId: number, produitName: string) => {
    confirm({
      title: `Retirer "${produitName}" ?`,
      message: 'Le produit ne sera plus associé à ce mandat.',
      type: 'warning',
      confirmText: 'Retirer',
      onConfirm: async () => {
        try {
          await deleteAssociationMutation.mutateAsync(associationId)
          showToast({
            type: 'success',
            title: 'Produit retiré',
            message: 'Le produit a été dissocié du mandat.',
          })
          refetchProduits()
          refetch()
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: err?.detail || 'Impossible de retirer le produit.',
          })
        }
      },
    })
  }

  const handleAssociationSuccess = () => {
    refetchProduits()
    refetch()
  }

  if (mandatId === null) {
    return <div className="text-center p-6">Mandat introuvable</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !mandat) {
    return (
      <div className="text-center p-6">
        <Alert type="error" message="Mandat non trouvé" />
      </div>
    )
  }

  const isActif = ['SIGNE', 'ACTIF'].includes(mandat.status)

  // Calculate total allocation
  const totalAllocation = produits?.reduce((sum, p) => {
    const association = p.mandat_produits?.find(
      (mp: any) => mp.mandat_id === mandatId
    )
    return sum + (association?.allocation_pourcentage || 0)
  }, 0) || 0

  type ProduitRow = {
    id: number
    name: string
    type: string
    isin_code: string | null
    status: string
    mandat_produits?: Array<{ id: number; mandat_id: number; allocation_pourcentage?: number }>
  }

  const produitColumns: ColumnV2<ProduitRow>[] = [
    {
      header: 'Nom',
      accessor: 'name',
      sticky: 'left',
      priority: 'high',
      minWidth: '180px',
    },
    {
      header: 'Type',
      accessor: 'type',
      priority: 'high',
      minWidth: '140px',
      render: (value: unknown, _row, _index: number): React.ReactNode => MANDAT_TYPE_LABELS[value as keyof typeof MANDAT_TYPE_LABELS] || String(value),
    },
    {
      header: 'Code ISIN',
      accessor: 'isin_code',
      priority: 'medium',
      minWidth: '140px',
      render: (value: unknown, _row, _index: number): React.ReactNode => String(value) || '-',
    },
    {
      header: 'Allocation',
      accessor: 'mandat_produits',
      priority: 'high',
      minWidth: '110px',
      render: (_: unknown, row: ProduitRow, _index: number) => {
        const association = row.mandat_produits?.find(
          (mp: any) => mp.mandat_id === mandatId
        )
        const allocation = association?.allocation_pourcentage
        return allocation != null ? (
          <span className="font-medium text-bleu">{allocation}%</span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      },
    },
    {
      header: 'Statut',
      accessor: 'status',
      priority: 'medium',
      minWidth: '100px',
      render: (value: unknown, _row, _index: number): React.ReactNode => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'ACTIF'
              ? 'bg-green-100 text-green-800'
              : value === 'ARCHIVE'
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: unknown, row: ProduitRow, _index: number) => {
        const association = row.mandat_produits?.find(
          (mp: any) => mp.mandat_id === mandatId
        )
        const actions: OverflowAction[] = [
          {
            label: 'Voir',
            icon: Eye,
            onClick: () => window.location.href = `/dashboard/produits/${id}`,
            variant: 'default'
          }
        ]
        if (association) {
          actions.push({
            label: 'Retirer',
            icon: Trash2,
            onClick: () => handleDeleteAssociationClick(association.id, row.name),
            variant: 'danger'
          })
        }
        return <OverflowMenu actions={actions} />
      },
    },
  ]

  const produitRows: ProduitRow[] = (produits ?? []).map((produit) => ({
    id: produit.id,
    name: produit.name,
    type: produit.type,
    isin_code: produit.isin_code ?? null,
    status: produit.status,
    mandat_produits: produit.mandat_produits,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">
            {mandat.numero_mandat ? mandat.numero_mandat : `Mandat #${mandat.id}`}
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            <Link
              href={`/dashboard/organisations/${mandat.organisation.id}`}
              className="text-bleu hover:underline"
            >
              {mandat.organisation.name}
            </Link>{' '}
            •{' '}
            <span
              className={
                isActif ? 'text-green-600 font-semibold' : 'text-gray-500'
              }
            >
              {MANDAT_STATUS_LABELS[mandat.status]}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Modifier
          </Button>
          <Button variant="danger" onClick={handleDeleteClick} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>

      {/* Informations du mandat */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Informations du mandat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Date de début</p>
            <p className="font-medium">
              {mandat.date_debut ? new Date(mandat.date_debut).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Date de fin</p>
            <p className="font-medium">
              {mandat.date_fin
                ? new Date(mandat.date_fin).toLocaleDateString('fr-FR')
                : 'Indéterminée'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Statut</p>
            <p className="font-medium">{MANDAT_STATUS_LABELS[mandat.status]}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Mandat actif</p>
            <p className="font-medium">
              {isActif ? (
                <span className="text-green-600">✓ Oui</span>
              ) : (
                <span className="text-gray-500">✗ Non</span>
              )}
            </p>
          </div>
        </div>

        {isActif && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ℹ️ Ce mandat est actif. Les produits associés peuvent être utilisés dans les
            interactions.
          </div>
        )}
      </Card>

      {/* Produits associés */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Produits associés ({produitRows.length})</h2>
            {produitRows.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Total allocation:{' '}
                <span className={`font-semibold ${totalAllocation === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {totalAllocation.toFixed(2)}%
                </span>
                {totalAllocation !== 100 && (
                  <span className="ml-2 text-orange-600">
                    ⚠️ Devrait être 100%
                  </span>
                )}
              </p>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAssociationModalOpen(true)}
            disabled={!isActif}
          >
            + Associer un produit
          </Button>
        </div>

        {!isActif && (
          <Alert
            type="warning"
            message="Le mandat doit être signé ou actif pour associer des produits."
          />
        )}

        {produitRows.length > 0 ? (
          <TableV2<ProduitRow>
            columns={produitColumns}
            data={produitRows}
            isLoading={false}
            isEmpty={false}
            rowKey={(row) => row.id.toString()}
            size="md"
            variant="default"
            stickyHeader
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            Aucun produit associé à ce mandat.
          </div>
        )}
      </Card>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le mandat"
      >
        <MandatForm
          initialData={mandat}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          error={updateMutation.error?.message}
          submitLabel="Enregistrer"
        />
      </Modal>

      {/* Modal d'association produit */}
      <MandatProduitAssociationModal
        isOpen={isAssociationModalOpen}
        onClose={() => setIsAssociationModalOpen(false)}
        mandatId={mandatId}
        mandatStatus={mandat.status}
        onSuccess={handleAssociationSuccess}
      />

      {/* Confirmation Dialogs */}
      <ConfirmDialogComponent />
    </div>
  )
}
