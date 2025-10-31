// app/dashboard/produits/page.tsx
// ============= PRODUITS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { useProduits } from '@/hooks/useProduits'
import { useFilters } from '@/hooks/useFilters'
import { usePagination } from '@/hooks/usePagination'
import { Card, Button, Input, Alert, AdvancedFilters } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { ProduitType, ProduitStatus } from '@/lib/types'
import { PRODUIT_TYPE_LABELS } from "@/lib/enums/labels"

interface Produit {
  id: number
  name: string
  type: ProduitType
  isin_code: string | null
  status: ProduitStatus
}

interface ProduitFilters {
  type: string
  status: string
}

export default function ProduitsPage() {
  const [searchText, setSearchText] = useState('')
  const pagination = usePagination({ initialLimit: 20 })

  const filters = useFilters<ProduitFilters>({
    initialValues: {
      type: '',
      status: '',
    },
  })

  const advancedFilterDefinitions = [
    {
      key: 'type',
      label: 'Type de produit',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les types' },
        { value: 'OPCVM', label: 'OPCVM (Fonds)' },
        { value: 'ETF', label: 'ETF (Trackers)' },
        { value: 'SCPI', label: 'SCPI (Immobilier)' },
        { value: 'ASSURANCE_VIE', label: 'Assurance Vie' },
        { value: 'PER', label: 'PER' },
        { value: 'FCP', label: 'FCP' },
        { value: 'SICAV', label: 'SICAV' },
        { value: 'AUTRE', label: 'Autre' },
      ],
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les statuts' },
        { value: 'actif', label: 'Actif' },
        { value: 'inactif', label: 'Inactif' },
        { value: 'en_attente', label: 'En attente' },
      ],
    },
  ]

  const { data, isLoading: _isLoading, error } = useProduits({
    limit: 100,
    type: filters.values.type || undefined,
    status: filters.values.status || undefined,
  })

  // Filtrer côté client par nom/ISIN + filtres avancés
  const filteredData = data?.items.filter((produit) => {
    const search = searchText.toLowerCase()
    const matchesSearch =
      produit.name.toLowerCase().includes(search) ||
      produit.isin_code?.toLowerCase().includes(search) ||
      false

    const matchesType = filters.values.type
      ? produit.type === filters.values.type
      : true

    const matchesStatus = filters.values.status
      ? produit.status === filters.values.status
      : true

    return matchesSearch && matchesType && matchesStatus
  })

  const columns: ColumnV2<Produit>[] = [
    {
      header: 'Nom',
      accessor: 'name',
      sticky: 'left',
      priority: 'high',
      minWidth: '200px',
    },
    {
      header: 'Type',
      accessor: 'type',
      priority: 'high',
      minWidth: '140px',
      render: (value: ProduitType) => (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
          {PRODUIT_TYPE_LABELS[value]}
        </span>
      ),
    },
    {
      header: 'Code ISIN',
      accessor: 'isin_code',
      priority: 'medium',
      minWidth: '140px',
      render: (value: string | null) => (
        <span className="font-mono text-sm">{value || '-'}</span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      priority: 'high',
      minWidth: '120px',
      render: (value: ProduitStatus) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'actif'
              ? 'bg-green-100 text-green-800'
              : value === 'inactif'
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
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: number) => {
        const actions: OverflowAction[] = [
          {
            label: 'Voir',
            icon: Eye,
            onClick: () => window.location.href = `/dashboard/produits/${id}`,
            variant: 'default',
          },
        ]
        return <OverflowMenu actions={actions} />
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Produits</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos produits financiers (OPCVM, ETF, SCPI, Assurance Vie, PER, etc.)
          </p>
        </div>
        <Link href="/dashboard/produits/new">
          <Button variant="primary">+ Nouveau produit</Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            placeholder="Rechercher par nom ou ISIN..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <AdvancedFilters
            filters={advancedFilterDefinitions}
            values={filters.values}
            onChange={filters.handleChange}
            onReset={filters.reset}
          />
        </div>
      </Card>

      {error && <Alert type="error" message={error.message || 'Erreur de chargement'} />}

      <Card>
        <TableV2<Produit>
          columns={columns}
          data={filteredData?.slice(pagination.skip, pagination.skip + pagination.limit) || []}
          getRowKey={(row) => row.id.toString()}
          size="md"
          variant="default"
          stickyHeader
          emptyMessage="Aucun produit trouvé"
        />

        {/* Pagination personnalisée */}
        {filteredData && filteredData.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border px-4">
            <div className="text-sm text-text-secondary">
              Page {Math.floor(pagination.skip / pagination.limit) + 1} sur {Math.ceil(filteredData.length / pagination.limit)} ({filteredData.length} produits au total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.setSkip(Math.max(0, pagination.skip - pagination.limit))}
                disabled={pagination.skip === 0}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.setSkip(pagination.skip + pagination.limit)}
                disabled={pagination.skip + pagination.limit >= filteredData.length}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Total: {filteredData?.length || 0} / {data.total} produits
          </p>
        </div>
      )}
    </div>
  )
}
