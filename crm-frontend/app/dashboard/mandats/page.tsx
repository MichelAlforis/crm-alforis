// app/dashboard/mandats/page.tsx
// ============= MANDATS LIST PAGE =============

'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useMandats } from '@/hooks/useMandats'
import { useTableColumns } from '@/hooks/useTableColumns'
import { Card, Button, Table, Alert, AdvancedFilters, ExportButtons, ColumnSelector } from '@/components/shared'
import SearchBar from '@/components/search/SearchBar'
import { MandatStatus } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  proposé: 'Proposé',
  signé: 'Signé',
  actif: 'Actif',
  terminé: 'Terminé',
}

export default function MandatsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [skip, setSkip] = useState(0)
  const [limit, setLimit] = useState(25)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | undefined>()
  const [filtersState, setFiltersState] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
  })

  const handleFilterChange = (key: string, value: unknown) => {
    if (Array.isArray(value)) return
    setFiltersState((prev) => ({
      ...prev,
      [key]: value as string,
    }))
  }

  const resetFilters = () =>
    setFiltersState({
      status: '',
      dateFrom: '',
      dateTo: '',
    })

  const advancedFilterDefinitions = [
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les statuts' },
        { value: 'proposé', label: 'Proposé' },
        { value: 'signé', label: 'Signé' },
        { value: 'actif', label: 'Actif' },
        { value: 'terminé', label: 'Terminé' },
      ],
    },
    {
      key: 'dateFrom',
      label: 'Date début après',
      type: 'date' as const,
    },
    {
      key: 'dateTo',
      label: 'Date fin avant',
      type: 'date' as const,
    },
  ]

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const { data, isLoading, error } = useMandats({
    limit: 100,
    status: filtersState.status || undefined,
  })

  // Define columns with useTableColumns hook
  const defaultColumns = useMemo(
    () => [
      {
        key: 'numero_mandat',
        header: 'N° Mandat',
        accessor: 'numero_mandat',
        visible: true,
        sortable: true,
        render: (value: string | null) => value || '-',
      },
      {
        key: 'organisation',
        header: 'Organisation',
        accessor: 'organisation',
        visible: true,
        sortable: true,
        render: (org: any) => (
          <Link
            href={`/dashboard/organisations/${org.id}`}
            className="text-bleu hover:underline"
          >
            {org.name}
          </Link>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        accessor: 'status',
        visible: true,
        sortable: true,
        render: (value: MandatStatus) => (
          <span
            className={`px-2 py-1 text-xs rounded ${
              value === 'ACTIF' || value === 'SIGNE'
                ? 'bg-green-100 text-green-800'
                : value === 'EXPIRE' || value === 'RESILIE'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {STATUS_LABELS[value]}
          </span>
        ),
      },
      {
        key: 'date_debut',
        header: 'Date début',
        accessor: 'date_debut',
        visible: true,
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
      },
      {
        key: 'date_fin',
        header: 'Date fin',
        accessor: 'date_fin',
        visible: false,
        sortable: true,
        render: (value: string | null) =>
          value ? new Date(value).toLocaleDateString('fr-FR') : 'Indéterminée',
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: 'id',
        visible: true,
        sortable: false,
        render: (id: number) => (
          <Link href={`/dashboard/mandats/${id}`} className="text-bleu hover:underline text-sm">
            Voir
          </Link>
        ),
      },
    ],
    [],
  )

  const { visibleColumns, toggleColumn, resetColumns } = useTableColumns({
    storageKey: 'mandats-columns',
    defaultColumns,
  })

  const filteredMandats = (data?.items ?? [])
    .filter((mandat) => {
      const search = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !search ||
        (mandat.numero_mandat ?? '').toLowerCase().includes(search) ||
        (mandat.organisation?.name ?? '').toLowerCase().includes(search)

      const matchesStatus = filtersState.status
        ? mandat.status === filtersState.status
        : true

      const dateDebut = mandat.date_debut ? new Date(mandat.date_debut) : null
      const matchesDateFrom = filtersState.dateFrom
        ? dateDebut && dateDebut >= new Date(filtersState.dateFrom)
        : true

      const dateFin = mandat.date_fin ? new Date(mandat.date_fin) : null
      const matchesDateTo = filtersState.dateTo
        ? dateFin && dateFin <= new Date(filtersState.dateTo)
        : true

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo
    })
    .sort((a, b) => {
      if (!sortConfig) return 0

      const aValue = (a as any)[sortConfig.key]
      const bValue = (b as any)[sortConfig.key]

      if (!aValue && !bValue) return 0
      if (!aValue) return 1
      if (!bValue) return -1

      if (typeof aValue === 'string') {
        const aStr = aValue.toLowerCase()
        const bStr = String(bValue).toLowerCase()
        return sortConfig.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      }

      if (aValue instanceof Date || typeof aValue === 'number') {
        return sortConfig.direction === 'asc' ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1
      }

      return 0
    })

  const exportParams = {
    status: filtersState.status || undefined,
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-bleu transition-colors mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Retour à l'annuaire</span>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Mandats de distribution</h1>
          <p className="text-gray-600 mt-1">
            Gérez les mandats de distribution de vos organisations
          </p>
        </div>
        <Link href="/dashboard/mandats/new">
          <Button variant="primary">+ Nouveau mandat</Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchBar
              placeholder="Rechercher un mandat…"
              entityType="mandats"
              onQueryChange={setSearchQuery}
              onSubmit={setSearchQuery}
              onSelectSuggestion={(suggestion) => {
                if (suggestion?.id) {
                  router.push(`/dashboard/mandats/${suggestion.id}`)
                }
              }}
            />
            <div className="flex items-center gap-2">
              <ColumnSelector
                columns={defaultColumns}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
              <ExportButtons
                resource="mandats"
                params={exportParams}
                baseFilename="mandats"
              />
            </div>
          </div>
          <AdvancedFilters
            filters={advancedFilterDefinitions}
            values={filtersState}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />
        </div>
      </Card>

      {error && <Alert type="error" message={error.message || 'Erreur de chargement'} />}

      <Card>
        <Table
          columns={visibleColumns}
          data={filteredMandats}
          isLoading={isLoading}
          isEmpty={filteredMandats.length === 0}
          sortConfig={sortConfig}
          onSort={handleSort}
          pagination={{
            total: data?.total || 0,
            skip: skip,
            limit: limit,
            onPageChange: (newSkip) => setSkip(newSkip),
            onLimitChange: (newLimit) => setLimit(newLimit),
          }}
        />
      </Card>
    </div>
  )
}
