
// app/dashboard/fournisseurs/[id]/page.tsx
// ============= FOURNISSEUR DETAIL PAGE =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useFournisseurs } from '@/hooks/useFournisseurs'
import { useKPIsFournisseur } from '@/hooks/useKPIsFournisseur'
import { Card, Button, Table, Alert, Modal } from '@/components/shared'
import { FournisseurForm } from '@/components/forms'
import { KPIForm } from '@/components/forms'
import { Fournisseur, KPICreate } from '@/lib/types'

export default function FournisseurDetailPage() {
  const params = useParams()
  const router = useRouter()
  const fournisseurId = parseInt(params.id as string)

  const { single: fournisseur, fetchFournisseur, updateFournisseur, delete: deleteOp, deleteFournisseur, update: updateOp } = useFournisseurs()
  const { kpis, fetchKPIs, createKPI, create: kpiCreate } = useKPIsFournisseur(fournisseurId)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isKPIModalOpen, setIsKPIModalOpen] = useState(false)

  useEffect(() => {
    fetchFournisseur(fournisseurId)
    fetchKPIs()
  }, [fournisseurId, fetchFournisseur, fetchKPIs])

  const handleUpdate = async (data: any) => {
    await updateFournisseur(fournisseurId, data)
    setIsEditModalOpen(false)
  }

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur?')) {
      await deleteFournisseur(fournisseurId)
      router.push('/dashboard/fournisseurs')
    }
  }

  const handleAddKPI = async (data: KPICreate) => {
    await createKPI(data)
    setIsKPIModalOpen(false)
  }

  if (fournisseur.isLoading) return <div className="text-center p-6">Chargement...</div>
  if (!fournisseur.data) return <div className="text-center p-6">Non trouvé</div>

  const data = fournisseur.data as Fournisseur

  const kpiColumns = [
    { header: 'Année', accessor: 'year' },
    { header: 'Mois', accessor: 'month' },
    { header: 'RDV', accessor: 'rdv_count' },
    { header: 'Closings', accessor: 'closings' },
    { header: 'Revenu', accessor: 'revenue', render: (v: number) => `${v}€` },
    { header: 'Comm. %', accessor: 'commission_rate' },
  ]

  // Stats
  const totalRevenue = kpis.data?.reduce((sum, k) => sum + (k.revenue || 0), 0) || 0
  const totalClosings = kpis.data?.reduce((sum, k) => sum + (k.closings || 0), 0) || 0
  const totalRDV = kpis.data?.reduce((sum, k) => sum + (k.rdv_count || 0), 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/fournisseurs" className="text-bleu hover:underline text-sm mb-2 block">
            ← Retour
          </Link>
          <h1 className="text-3xl font-bold text-ardoise">{data.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Éditer
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteOp.isLoading}>
            Supprimer
          </Button>
        </div>
      </div>

      {/* Main info */}
      <Card padding="lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-sm">{data.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Téléphone</p>
            <p className="font-medium text-sm">{data.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Secteur</p>
            <p className="font-medium text-sm">{data.industry || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Contact</p>
            <p className="font-medium text-sm">{data.contact_person || '-'}</p>
          </div>
        </div>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-bleu">{totalRDV}</div>
          <p className="text-gray-600 text-sm">RDV totaux</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-vert">{totalClosings}</div>
          <p className="text-gray-600 text-sm">Closings totaux</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-orange-500">{totalRevenue}€</div>
          <p className="text-gray-600 text-sm">Revenu total</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-500">{kpis.data?.length || 0}</div>
          <p className="text-gray-600 text-sm">Mois saisies</p>
        </Card>
      </div>

      {/* KPIs Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">KPIs</h2>
        <Button variant="primary" onClick={() => setIsKPIModalOpen(true)}>
          + Ajouter KPI
        </Button>
      </div>

      {kpis.error && <Alert type="error" message={kpis.error} />}

      <Card>
        <Table
          columns={kpiColumns}
          data={kpis.data || []}
          isLoading={kpis.isLoading}
          isEmpty={kpis.data?.length === 0}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Éditer le fournisseur"
      >
        <FournisseurForm
          initialData={data}
          onSubmit={handleUpdate}
          isLoading={updateOp.isLoading}
          error={updateOp.error}
          submitLabel="Mettre à jour"
        />
      </Modal>

      {/* Add KPI Modal */}
      <Modal
        isOpen={isKPIModalOpen}
        onClose={() => setIsKPIModalOpen(false)}
        title="Ajouter un KPI"
      >
        <KPIForm
          onSubmit={handleAddKPI}
          isLoading={kpiCreate.isLoading}
          error={kpiCreate.error}
        />
      </Modal>
    </div>
  )
}