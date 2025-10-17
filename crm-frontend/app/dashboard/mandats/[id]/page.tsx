// app/dashboard/mandats/[id]/page.tsx
// ============= MANDAT DETAIL PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMandat, useUpdateMandat, useDeleteMandat } from '@/hooks/useMandats'
import { useProduitsByMandat } from '@/hooks/useProduits'
import { Card, Button, Table, Alert, Modal } from '@/components/shared'
import { MandatForm } from '@/components/forms'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { MandatDistributionUpdate } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_NEGOCIATION: 'En négociation',
  SIGNE: 'Signé',
  ACTIF: 'Actif',
  EXPIRE: 'Expiré',
  RESILIE: 'Résilié',
}

const TYPE_LABELS: Record<string, string> = {
  OPCVM: 'OPCVM (Fonds)',
  ETF: 'ETF (Trackers)',
  SCPI: 'SCPI (Immobilier)',
  ASSURANCE_VIE: 'Assurance Vie',
  PER: 'PER',
  AUTRE: 'Autre',
}

export default function MandatDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const mandatId = React.useMemo(() => {
    const rawId = params?.id
    const parsed = rawId ? Number.parseInt(rawId, 10) : NaN
    return Number.isNaN(parsed) ? null : parsed
  }, [params])

  const { data: mandat, isLoading, error } = useMandat(mandatId ?? 0)
  const { data: produits } = useProduitsByMandat(mandatId ?? 0)
  const updateMutation = useUpdateMandat()
  const deleteMutation = useDeleteMandat()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleUpdate = async (data: MandatDistributionUpdate) => {
    if (!mandatId) return
    await updateMutation.mutateAsync({ id: mandatId, data })
    setIsEditModalOpen(false)
  }

  const handleDelete = async () => {
    if (!mandatId) return
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer ce mandat ? Cette action est irréversible."
      )
    ) {
      await deleteMutation.mutateAsync(mandatId)
      router.push('/dashboard/mandats')
    }
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

  const produitColumns = [
    {
      header: 'Nom',
      accessor: 'name',
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (value: string) => TYPE_LABELS[value] || value,
    },
    {
      header: 'Code ISIN',
      accessor: 'isin_code',
      render: (value: string | null) => value || '-',
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'ACTIF'
              ? 'bg-green-100 text-green-800'
              : value === 'ARCHIVE'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <Link href={`/dashboard/produits/${id}`} className="text-bleu hover:underline text-sm">
          Voir
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">
            {mandat.numero_mandat ? mandat.numero_mandat : `Mandat #${mandat.id}`}
          </h1>
          <p className="text-gray-600 mt-1">
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
              {STATUS_LABELS[mandat.status]}
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

      {/* Informations du mandat */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Informations du mandat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Date de début</p>
            <p className="font-medium">
              {mandat.date_debut ? new Date(mandat.date_debut).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date de fin</p>
            <p className="font-medium">
              {mandat.date_fin
                ? new Date(mandat.date_fin).toLocaleDateString('fr-FR')
                : 'Indéterminée'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Statut</p>
            <p className="font-medium">{STATUS_LABELS[mandat.status]}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Mandat actif</p>
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
          <h2 className="text-xl font-semibold">Produits associés ({produits?.length || 0})</h2>
          <Link href={`/dashboard/produits/new?mandat_id=${mandatId}`}>
            <Button variant="primary" size="sm">
              + Associer un produit
            </Button>
          </Link>
        </div>

        {produits && produits.length > 0 ? (
          <Table columns={produitColumns} data={produits} isLoading={false} isEmpty={false} />
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
    </div>
  )
}
