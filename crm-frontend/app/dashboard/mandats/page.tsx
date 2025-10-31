// app/dashboard/mandats/page.tsx
// ============= MANDATS LIST PAGE =============

'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { ArrowLeft, Eye } from 'lucide-react'
import { useMandats } from '@/hooks/useMandats'
import { useFilters } from '@/hooks/useFilters'
import { usePagination } from '@/hooks/usePagination'
import { Card, Button, Alert, AdvancedFilters, ExportButtons } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { SearchEntity } from '@/components/shared/Search'
import { MandatStatus } from '@/lib/types'
import { MANDAT_STATUS_LABELS } from "@/lib/enums/labels"

interface Mandat {
  id: number
  numero_mandat: string | null
  organisation: {
    id: number
    name: string
  }
  status: MandatStatus
  date_debut: string
  date_fin: string | null
}

interface MandatFilters {
  status: string
  dateFrom: string
  dateTo: string
}

export default function MandatsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | undefined>()

  // Use pagination hook
  const pagination = usePagination({ initialLimit: 20 })

  // Use new useFilters hook
  const filters = useFilters<MandatFilters>({
    initialValues: {
      status: '',
      dateFrom: '',
      dateTo: '',
    },
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

  const { data, isLoading: _isLoading, error } = useMandats({
    limit: 100,
    status: filters.values.status || undefined,
  })

  const columns: ColumnV2<Mandat>[] = useMemo(
    () => [
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
        header: 'Statut',
        accessor: 'status',
        priority: 'high',
        minWidth: '120px',
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
            {MANDAT_STATUS_LABELS[value]}
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
        header: 'Date fin',
        accessor: 'date_fin',
        priority: 'low',
        minWidth: '120px',
        render: (value: string | null) =>
          value ? new Date(value).toLocaleDateString('fr-FR') : 'Indéterminée',
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
              onClick: () => router.push(`/dashboard/mandats/${id}`),
              variant: 'default',
            },
          ]
          return <OverflowMenu actions={actions} />
        },
      },
    ],
    [router],
  )

  const filteredMandats = (data?.items ?? [])
    .filter((mandat) => {
      const search = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !search ||
        (mandat.numero_mandat ?? '').toLowerCase().includes(search) ||
        (mandat.organisation?.name ?? '').toLowerCase().includes(search)

      const matchesStatus = filters.values.status
        ? mandat.status === filters.values.status
        : true

      const dateDebut = mandat.date_debut ? new Date(mandat.date_debut) : null
      const matchesDateFrom = filters.values.dateFrom
        ? dateDebut && dateDebut >= new Date(filters.values.dateFrom)
        : true

      const dateFin = mandat.date_fin ? new Date(mandat.date_fin) : null
      const matchesDateTo = filters.values.dateTo
        ? dateFin && dateFin <= new Date(filters.values.dateTo)
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

  // Paginate filtered and sorted data
  const paginatedMandats = filteredMandats.slice(pagination.skip, pagination.skip + pagination.limit)

  const exportParams = {
    status: filters.values.status || undefined,
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-bleu transition-colors mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Retour à l'annuaire</span>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Mandats de distribution</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
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
            <SearchEntity
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
            <ExportButtons
              resource="mandats"
              params={exportParams}
              baseFilename="mandats"
            />
          </div>
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
        <TableV2<Mandat>
          columns={columns}
          data={paginatedMandats}
          getRowKey={(row) => row.id.toString()}
          sortConfig={sortConfig}
          onSort={handleSort}
          size="md"
          variant="default"
          stickyHeader
          emptyMessage="Aucun mandat trouvé"
        />

        {/* Pagination personnalisée */}
        {filteredMandats.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border px-4">
            <div className="text-sm text-text-secondary">
              Page {Math.floor(pagination.skip / pagination.limit) + 1} sur {Math.ceil(filteredMandats.length / pagination.limit)} ({filteredMandats.length} mandats au total)
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
                disabled={pagination.skip + pagination.limit >= filteredMandats.length}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
