// app/dashboard/kpis/page.tsx - MIGRATED TO ORGANISATION API
// ============= KPIs PAGE - ORGANISATION-BASED =============

'use client'
import { logger } from '@/lib/logger'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useConfirm } from '@/hooks/useConfirm'
import { Card, Button, Modal, Alert } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Trash2 } from 'lucide-react'
import React, { lazy, Suspense } from "react"

// Lazy load KPI form (loaded only when modal opens)
const KPIForm = lazy(() => import("@/components/forms").then(m => ({ default: m.KPIForm })))

// OLD: import { KPIForm } from '@/components/forms'
import { KPI, KPICreate } from '@/lib/types'
import { storage, AUTH_STORAGE_KEYS } from '@/lib/constants'
import { useUIStore } from '@/stores/ui'
import { useUrlState } from '@/hooks/useUrlState'

export default function KPIsPage() {
  const { data: organisations } = useOrganisations({ limit: 200 })
  const { confirm, ConfirmDialogComponent } = useConfirm()

  // URL state for fournisseur (shareable, bookmarkable)
  const [selectedFournisseurIdParam, setSelectedFournisseurIdParam] = useUrlState('fournisseur', '')
  const selectedFournisseurId = selectedFournisseurIdParam ? Number(selectedFournisseurIdParam) : null
  const setSelectedFournisseurId = (id: number | null) => setSelectedFournisseurIdParam(id ? String(id) : '')

  const [kpis, setKpis] = useState<KPI[]>([])
  const [kpisLoading, setKpisLoading] = useState(false)
  const [kpisError, setKpisError] = useState<string>()

  // Zustand for modal state (global)
  const activeModal = useUIStore((state) => state.activeModal)
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)
  const isModalOpen = activeModal === 'create-kpi'

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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)
      const response = await fetch(`${API_BASE}/api/v1/stats/organisation/${selectedFournisseurId}/kpis`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      })
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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)
      const response = await fetch(`${API_BASE}/api/v1/stats/organisation/${selectedFournisseurId}/kpis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create KPI')
      await fetchKPIs()
      closeModal()
    } catch (err: any) {
      logger.error('Error creating KPI:', err)
    }
  }

  const handleDelete = async (kpiId: number | null) => {
    if (!selectedFournisseurId || !kpiId) return
    confirm({
      title: 'Supprimer le KPI',
      message: 'Êtes-vous sûr de vouloir supprimer ce KPI ? Cette action est irréversible.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)
          const response = await fetch(`${API_BASE}/api/v1/stats/kpis/${kpiId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            }
          })
          if (!response.ok) throw new Error('Failed to delete KPI')
          await fetchKPIs()
        } catch (err: any) {
          logger.error('Error deleting KPI:', err)
        }
      },
    })
  }

  const columns: ColumnV2<KPI>[] = [
    {
      header: 'Année',
      accessor: 'year',
      sticky: 'left',
      priority: 'high',
      minWidth: '80px',
    },
    {
      header: 'Mois',
      accessor: 'month',
      priority: 'high',
      minWidth: '60px',
    },
    {
      header: 'RDV',
      accessor: 'rdv_count',
      priority: 'high',
      minWidth: '60px',
    },
    {
      header: 'Pitchs',
      accessor: 'pitchs',
      priority: 'medium',
      minWidth: '70px',
    },
    {
      header: 'Due Dil.',
      accessor: 'due_diligences',
      priority: 'medium',
      minWidth: '80px',
    },
    {
      header: 'Closings',
      accessor: 'closings',
      priority: 'high',
      minWidth: '80px',
    },
    {
      header: 'Revenu',
      accessor: 'revenue',
      priority: 'high',
      minWidth: '100px',
      render: (value: number) => `${value || 0}€`,
    },
    {
      header: 'Comm. %',
      accessor: 'commission_rate',
      priority: 'medium',
      minWidth: '90px',
      render: (value: number | null) => (value != null ? `${value}%` : '—'),
    },
    {
      header: 'Source',
      accessor: 'source',
      priority: 'low',
      minWidth: '110px',
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
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: number | null, row: KPI) => {
        if (!id || row.auto_generated) {
          return <span className="text-xs text-gray-400">—</span>
        }
        const actions: OverflowAction[] = [
          {
            label: 'Supprimer',
            icon: Trash2,
            onClick: () => handleDelete(id),
            variant: 'danger'
          }
        ]
        return <OverflowMenu actions={actions} />
      },
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
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Sélectionner un fournisseur
          </label>
          <select
            value={selectedFournisseurId || ''}
            onChange={(e) => setSelectedFournisseurId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
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
            <Button variant="primary" onClick={() => openModal('create-kpi')}>
              + Ajouter KPI
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="text-center">
              <div className="text-2xl font-bold text-bleu">{totalRDV}</div>
              <p className="text-gray-600 dark:text-slate-400 text-xs">RDV totaux</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-purple-500">{totalPitchs}</div>
              <p className="text-gray-600 dark:text-slate-400 text-xs">Pitchs totaux</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-vert">{totalClosings}</div>
              <p className="text-gray-600 dark:text-slate-400 text-xs">Closings totaux</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-orange-500">{totalRevenue}€</div>
              <p className="text-gray-600 dark:text-slate-400 text-xs">Revenu total</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-indigo-500">{kpis.length}</div>
              <p className="text-gray-600 dark:text-slate-400 text-xs">Mois saisies</p>
            </Card>
          </div>

          {/* Erreurs */}
          {kpisError && (
            <Alert type="error" message={kpisError} />
          )}

          {/* Tableau des KPIs */}
          <Card className="overflow-x-auto">
            <TableV2<KPI>
              columns={columns}
              data={kpis}
              isLoading={kpisLoading}
              isEmpty={kpis.length === 0}
              emptyMessage="Aucun KPI enregistré pour ce fournisseur"
              rowKey={(row) => row.id?.toString() || `${row.year}-${row.month}`}
              size="md"
              variant="default"
              stickyHeader
            />
          </Card>

          {/* Modal formulaire */}
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title={`Ajouter un KPI pour ${selectedFournisseur.name}`}
          >
            <Suspense fallback={<div className="p-4">Chargement...</div>}>
              <KPIForm
                onSubmit={handleAddKPI}
                isLoading={kpisLoading}
                error={kpisError}
              />
            </Suspense>
          </Modal>
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
