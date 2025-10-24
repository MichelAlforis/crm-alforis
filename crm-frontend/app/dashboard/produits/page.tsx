// app/dashboard/produits/page.tsx
// ============= PRODUITS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProduits } from '@/hooks/useProduits'
import { useFilters } from '@/hooks/useFilters'
import { Card, Button, Table, Input, Alert, AdvancedFilters } from '@/components/shared'
import { ProduitType, ProduitStatus } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  OPCVM: 'OPCVM (Fonds)',
  ETF: 'ETF (Trackers)',
  SCPI: 'SCPI (Immobilier)',
  ASSURANCE_VIE: 'Assurance Vie',
  PER: 'PER',
  AUTRE: 'Autre',
  FCP: 'FCP',
  SICAV: 'SICAV',
  'Fonds Alternatif': 'Fonds Alternatif',
  Autre: 'Autre',
}

interface ProduitFilters {
  type: string
  status: string
}

export default function ProduitsPage() {
  const [searchText, setSearchText] = useState('')

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

  const { data, isLoading, error } = useProduits({
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

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (value: ProduitType) => (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
          {TYPE_LABELS[value]}
        </span>
      ),
    },
    {
      header: 'Code ISIN',
      accessor: 'isin_code',
      render: (value: string | null) => (
        <span className="font-mono text-sm">{value || '-'}</span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
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
      render: (id: number) => (
        <Link href={`/dashboard/produits/${id}`} className="text-bleu hover:underline text-sm">
          Voir
        </Link>
      ),
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
        <Table
          columns={columns}
          data={filteredData || []}
          isLoading={isLoading}
          isEmpty={!filteredData || filteredData.length === 0}
        />
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
