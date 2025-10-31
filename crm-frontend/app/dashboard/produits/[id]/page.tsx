// app/dashboard/produits/[id]/page.tsx
// ============= PRODUIT DETAIL PAGE =============

'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { useProduit, useUpdateProduit, useDeleteProduit } from '@/hooks/useProduits'
import { useEntityDetail } from '@/hooks/useEntityDetail'
import { Card, Button, Alert, Modal } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Eye } from 'lucide-react'
import { ProduitForm } from '@/components/forms'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { ProduitUpdate } from '@/lib/types'
import { PRODUIT_TYPE_LABELS, PRODUIT_STATUS_LABELS, MANDAT_STATUS_LABELS } from "@/lib/enums/labels"

export default function ProduitDetailPage() {
  const router = useRouter()
  const {
    entityId: produitId,
    isValidId,
    isEditModalOpen,
    setIsEditModalOpen,
    handleDeleteWithRedirect,
  } = useEntityDetail({ listRoute: ROUTES.CRM.PRODUITS })

  const { data: produit, isLoading, error } = useProduit(produitId ?? 0)
  const updateMutation = useUpdateProduit()
  const deleteMutation = useDeleteProduit()

  const handleUpdate = async (data: ProduitUpdate) => {
    if (!produitId) return
    await updateMutation.mutateAsync({ id: produitId, data })
    setIsEditModalOpen(false)
  }

  const handleDelete = async () => {
    if (!produitId) return
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible et supprimera toutes les associations avec les mandats."
      )
    ) {
      await handleDeleteWithRedirect(async () => {
        await deleteMutation.mutateAsync(produitId)
      })
    }
  }

  if (!isValidId) {
    return <div className="text-center p-6">Produit introuvable</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !produit) {
    return (
      <div className="text-center p-6">
        <Alert type="error" message="Produit non trouvé" />
      </div>
    )
  }

  type MandatRow = {
    id: number
    numero_mandat: string | null
    organisation: { id: number; name: string }
    status: string
    date_debut: string
  }

  const mandatColumns: ColumnV2<MandatRow>[] = [
    {
      header: 'N° Mandat',
      accessor: 'numero_mandat',
      sticky: 'left',
      priority: 'high',
      minWidth: '140px',
      render: (value: string | null) => value || '-',
    },
    {
      header: 'Organisation',
      accessor: 'organisation',
      priority: 'high',
      minWidth: '200px',
      render: (org: { id: number; name: string }) => (
        <Link
          href={`/dashboard/organisations/${org.id}`}
          className="text-bleu hover:underline"
        >
          {org.name}
        </Link>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      priority: 'high',
      minWidth: '120px',
      render: (value: string) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'ACTIF' || value === 'SIGNE'
              ? 'bg-green-100 text-green-800'
              : value === 'EXPIRE' || value === 'RESILIE'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {MANDAT_STATUS_LABELS[value] || value}
        </span>
      ),
    },
    {
      header: 'Date début',
      accessor: 'date_debut',
      priority: 'medium',
      minWidth: '120px',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: number) => {
        const actions: OverflowAction[] = [
          {
            label: 'Voir',
            icon: Eye,
            onClick: () => window.location.href = `/dashboard/mandats/${id}`,
            variant: 'default'
          }
        ]
        return <OverflowMenu actions={actions} />
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">{produit.name}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            {PRODUIT_TYPE_LABELS[produit.type]} •{' '}
            <span
              className={
                produit.status === 'ACTIF'
                  ? 'text-green-600'
                  : produit.status === 'ARCHIVE'
                    ? 'text-gray-500'
                    : 'text-yellow-600'
              }
            >
              {PRODUIT_STATUS_LABELS[produit.status]}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Modifier
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>

      {/* Informations générales */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Type de produit</p>
            <p className="font-medium">{PRODUIT_TYPE_LABELS[produit.type]}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Code ISIN</p>
            <p className="font-medium font-mono">{produit.isin_code || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Statut</p>
            <p className="font-medium">{PRODUIT_STATUS_LABELS[produit.status]}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-600 dark:text-slate-400">Description</p>
            <p className="font-medium">{produit.description || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Mandats associés */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Mandats associés ({produit.mandats?.length || 0})
          </h2>
        </div>

        {produit.mandats && produit.mandats.length > 0 ? (
          <TableV2<MandatRow>
            columns={mandatColumns}
            data={produit.mandats}
            isLoading={false}
            isEmpty={false}
            getRowKey={(row) => row.id.toString()}
            size="md"
            variant="default"
            stickyHeader
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            Aucun mandat associé à ce produit.
            <p className="mt-2 text-sm">
              Associez ce produit à un mandat depuis la{' '}
              <Link href="/dashboard/mandats" className="text-bleu hover:underline">
                page des mandats
              </Link>
              .
            </p>
          </div>
        )}
      </Card>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le produit"
      >
        <ProduitForm
          initialData={produit}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          error={updateMutation.error?.message}
          submitLabel="Enregistrer"
        />
      </Modal>
    </div>
  )
}
