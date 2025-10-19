// app/dashboard/kpis/page.tsx - UPDATED
// ============= KPIs PAGE - UPDATED PAR FOURNISSEUR =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFournisseurs } from '@/hooks/useFournisseurs'
import { useKPIsFournisseur } from '@/hooks/useKPIsFournisseur'
import { Card, Button, Table, Modal, Alert } from '@/components/shared'
import { KPIForm } from '@/components/forms'
import { KPI, KPICreate } from '@/lib/types'

export default function KPIsPage() {
  const { fournisseurs, fetchFournisseurs } = useFournisseurs()
  const [selectedFournisseurId, setSelectedFournisseurId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const kpis = selectedFournisseurId ? useKPIsFournisseur(selectedFournisseurId) : null

  useEffect(() => {
    fetchFournisseurs(0, 1000)
  }, [])

  useEffect(() => {
    if (selectedFournisseurId && kpis) {
      kpis.fetchKPIs()
    }
  }, [selectedFournisseurId])

  const handleAddKPI = async (data: KPICreate) => {
    if (kpis) {
      await kpis.createKPI(data)
      setIsModalOpen(false)
    }
  }

  const handleDelete = async (kpiId: number | null) => {
    if (!kpis || !kpiId) return
    if (kpis && kpiId && confirm('Supprimer ce KPI?')) {
      await kpis.deleteKPI(kpiId)
    }
  }

  const columns = [
    {
      header: 'Année',
      accessor: 'year',
    },
    {
      header: 'Mois',
      accessor: 'month',
    },
    {
      header: 'RDV',
      accessor: 'rdv_count',
    },
    {
      header: 'Pitchs',
      accessor: 'pitchs',
    },
    {
      header: 'Due Dil.',
      accessor: 'due_diligences',
    },
    {
      header: 'Closings',
      accessor: 'closings',
    },
    {
      header: 'Revenu',
      accessor: 'revenue',
      render: (value: number) => `${value || 0}€`,
    },
    {
      header: 'Comm. %',
      accessor: 'commission_rate',
      render: (value: number | null) => (value != null ? `${value}%` : '—'),
    },
    {
      header: 'Source',
      accessor: 'source',
      render: (_: string | undefined, row: KPI) =>
        row.auto_generated ? (
          <span className="text-xs font-medium text-orange-500">Automatique</span>
        ) : (
          <span className="text-xs text-gray-500">Manuel</span>
        ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number | null, row: KPI) =>
        id && !row.auto_generated ? (
          <button
            onClick={() => handleDelete(id)}
            className="text-rouge hover:underline text-sm"
          >
            Supprimer
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ]

  // Calculs statistiques
  const totalRevenue = kpis?.kpis.data?.reduce((sum, kpi) => sum + (kpi.revenue || 0), 0) || 0
  const totalClosings = kpis?.kpis.data?.reduce((sum, kpi) => sum + (kpi.closings || 0), 0) || 0
  const totalRDV = kpis?.kpis.data?.reduce((sum, kpi) => sum + (kpi.rdv_count || 0), 0) || 0
  const totalPitchs = kpis?.kpis.data?.reduce((sum, kpi) => sum + (kpi.pitchs || 0), 0) || 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-ardoise">KPIs par Fournisseur</h1>

      {/* Sélection du fournisseur */}
      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un fournisseur
          </label>
          <select
            value={selectedFournisseurId || ''}
            onChange={(e) => setSelectedFournisseurId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          >
            <option value="">-- Choisir un fournisseur --</option>
            {fournisseurs.data?.items?.map((fss) => (
              <option key={fss.id} value={fss.id}>
                {fss.name}
              </option>
            ))}
          </select>
        </div>

        {fournisseurs.error && (
          <Alert type="error" message={fournisseurs.error} />
        )}
      </Card>

      {selectedFournisseurId && kpis && (
        <>
          {/* En-tête avec lien détail fournisseur */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ardoise">
                {fournisseurs.data?.items?.find(f => f.id === selectedFournisseurId)?.name}
              </h2>
              <Link 
                href={`/dashboard/fournisseurs/${selectedFournisseurId}`}
                className="text-bleu hover:underline text-sm mt-1 inline-block"
              >
                Voir détail du fournisseur →
              </Link>
            </div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              + Ajouter KPI
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="text-center">
              <div className="text-2xl font-bold text-bleu">{totalRDV}</div>
              <p className="text-gray-600 text-xs">RDV totaux</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-purple-500">{totalPitchs}</div>
              <p className="text-gray-600 text-xs">Pitchs totaux</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-vert">{totalClosings}</div>
              <p className="text-gray-600 text-xs">Closings totaux</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-orange-500">{totalRevenue}€</div>
              <p className="text-gray-600 text-xs">Revenu total</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-indigo-500">{kpis.kpis.data?.length || 0}</div>
              <p className="text-gray-600 text-xs">Mois saisies</p>
            </Card>
          </div>

          {/* Erreurs */}
          {kpis.kpis.error && (
            <Alert type="error" message={kpis.kpis.error} />
          )}

          {/* Tableau des KPIs */}
          <Card className="overflow-x-auto">
            <Table
              columns={columns}
              data={kpis.kpis.data || []}
              isLoading={kpis.kpis.isLoading}
              isEmpty={kpis.kpis.data?.length === 0}
            />
          </Card>

          {/* Modal formulaire */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={`Ajouter un KPI pour ${fournisseurs.data?.items?.find(f => f.id === selectedFournisseurId)?.name}`}
          >
            <KPIForm
              onSubmit={handleAddKPI}
              isLoading={kpis.create.isLoading}
              error={kpis.create.error}
            />
          </Modal>
        </>
      )}
    </div>
  )
}
