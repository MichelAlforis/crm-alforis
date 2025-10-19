// app/dashboard/kpis/page.tsx - MIGRATED TO ORGANISATION API
// ============= KPIs PAGE - ORGANISATION-BASED =============

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useOrganisations } from '@/hooks/useOrganisations'
import { Card, Button, Table, Modal, Alert } from '@/components/shared'
import { KPIForm } from '@/components/forms'
import { KPI, KPICreate } from '@/lib/types'

export default function KPIsPage() {
  const { data: organisations } = useOrganisations({ limit: 1000 })
  const [selectedFournisseurId, setSelectedFournisseurId] = useState<number | null>(null)
  const [kpis, setKpis] = useState<KPI[]>([])
  const [kpisLoading, setKpisLoading] = useState(false)
  const [kpisError, setKpisError] = useState<string>()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filter for fournisseur type organisations only
  const fournisseurs = useMemo(() => {
    return organisations?.items?.filter((org: any) => org.organisation_type === 'fournisseur') || []
  }, [organisations])

  useEffect(() => {
    if (selectedFournisseurId) {
      fetchKPIs()
    }
  }, [selectedFournisseurId])

  const fetchKPIs = async () => {
    if (!selectedFournisseurId) return
    setKpisLoading(true)
    setKpisError(undefined)
    try {
      const response = await fetch(`/api/organisations/${selectedFournisseurId}/kpis`)
      if (!response.ok) throw new Error('Failed to fetch KPIs')
      const data = await response.json()
      setKpis(Array.isArray(data) ? data : data.items || [])
    } catch (err: any) {
      setKpisError(err.message || 'Erreur lors du chargement des KPIs')
      setKpis([])
    } finally {
      setKpisLoading(false)
    }
  }

  const handleAddKPI = async (data: KPICreate) => {
    if (!selectedFournisseurId) return
    try {
      const response = await fetch(`/api/organisations/${selectedFournisseurId}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create KPI')
      await fetchKPIs()
      setIsModalOpen(false)
    } catch (err: any) {
      console.error('Error creating KPI:', err)
    }
  }

  const handleDelete = async (kpiId: number | null) => {
    if (!selectedFournisseurId || !kpiId) return
    if (confirm('Supprimer ce KPI?')) {
      try {
        const response = await fetch(`/api/organisations/${selectedFournisseurId}/kpis/${kpiId}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete KPI')
        await fetchKPIs()
      } catch (err: any) {
        console.error('Error deleting KPI:', err)
      }
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
  const totalRevenue = kpis.reduce((sum, kpi) => sum + (kpi.revenue || 0), 0)
  const totalClosings = kpis.reduce((sum, kpi) => sum + (kpi.closings || 0), 0)
  const totalRDV = kpis.reduce((sum, kpi) => sum + (kpi.rdv_count || 0), 0)
  const totalPitchs = kpis.reduce((sum, kpi) => sum + (kpi.pitchs || 0), 0)

  const selectedFournisseur = fournisseurs.find(f => f.id === selectedFournisseurId)

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
            {fournisseurs?.map((fss: any) => (
              <option key={fss.id} value={fss.id}>
                {fss.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {selectedFournisseurId && selectedFournisseur && (
        <>
          {/* En-tête avec lien détail fournisseur */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ardoise">
                {selectedFournisseur.name}
              </h2>
              <Link 
                href={`/dashboard/organisations/${selectedFournisseurId}`}
                className="text-bleu hover:underline text-sm mt-1 inline-block"
              >
                Voir détail de l'organisation →
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
              <div className="text-2xl font-bold text-indigo-500">{kpis.length}</div>
              <p className="text-gray-600 text-xs">Mois saisies</p>
            </Card>
          </div>

          {/* Erreurs */}
          {kpisError && (
            <Alert type="error" message={kpisError} />
          )}

          {/* Tableau des KPIs */}
          <Card className="overflow-x-auto">
            <Table
              columns={columns}
              data={kpis}
              isLoading={kpisLoading}
              isEmpty={kpis.length === 0}
            />
          </Card>

          {/* Modal formulaire */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={`Ajouter un KPI pour ${selectedFournisseur.name}`}
          >
            <KPIForm
              onSubmit={handleAddKPI}
              isLoading={kpisLoading}
              error={kpisError}
            />
          </Modal>
        </>
      )}
    </div>
  )
}
