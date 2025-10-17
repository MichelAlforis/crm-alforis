// app/dashboard/produits/page.tsx
// ============= PRODUITS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProduits } from '@/hooks/useProduits'
import { Card, Button, Table, Input, Alert, Select } from '@/components/shared'
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

export default function ProduitsPage() {
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useProduits({
    limit: 100,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  })

  // Filtrer côté client par nom/ISIN
  const filteredData = data?.items.filter((produit) => {
    const search = searchText.toLowerCase()
    return (
      produit.name.toLowerCase().includes(search) ||
      produit.isin_code?.toLowerCase().includes(search) ||
      ''
    )
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Rechercher par nom ou ISIN..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="OPCVM">OPCVM (Fonds)</option>
            <option value="ETF">ETF (Trackers)</option>
            <option value="SCPI">SCPI (Immobilier)</option>
            <option value="ASSURANCE_VIE">Assurance Vie</option>
            <option value="PER">PER</option>
            <option value="AUTRE">Autre</option>
          </Select>

          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
            <option value="ARCHIVE">Archivé</option>
          </Select>
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
