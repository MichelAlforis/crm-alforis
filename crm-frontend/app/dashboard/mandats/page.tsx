// app/dashboard/mandats/page.tsx
// ============= MANDATS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMandats } from '@/hooks/useMandats'
import { Card, Button, Table, Alert, AdvancedFilters, ExportButtons } from '@/components/shared'
import SearchBar from '@/components/search/SearchBar'
import { MandatStatus } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_NEGOCIATION: 'En négociation',
  SIGNE: 'Signé',
  ACTIF: 'Actif',
  EXPIRE: 'Expiré',
  RESILIE: 'Résilié',
  proposé: 'Proposé',
  signé: 'Signé',
  actif: 'Actif',
  terminé: 'Terminé',
}

export default function MandatsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
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
        { value: 'BROUILLON', label: 'Brouillon' },
        { value: 'EN_NEGOCIATION', label: 'En négociation' },
        { value: 'SIGNE', label: 'Signé' },
        { value: 'ACTIF', label: 'Actif' },
        { value: 'EXPIRE', label: 'Expiré' },
        { value: 'RESILIE', label: 'Résilié' },
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

  const { data, isLoading, error } = useMandats({
    limit: 100,
    status: filtersState.status || undefined,
  })

  const columns = [
    {
      header: 'N° Mandat',
      accessor: 'numero_mandat',
      render: (value: string | null) => value || '-',
    },
    {
      header: 'Organisation',
      accessor: 'organisation',
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
      header: 'Date début',
      accessor: 'date_debut',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Date fin',
      accessor: 'date_fin',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : 'Indéterminée',
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <Link href={`/dashboard/mandats/${id}`} className="text-bleu hover:underline text-sm">
          Voir
        </Link>
      ),
    },
  ]

  const filteredMandats = (data?.items ?? []).filter((mandat) => {
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

  const exportParams = {
    status: filtersState.status || undefined,
  }

  return (
    <div className="space-y-6">
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
            <ExportButtons
              resource="mandats"
              params={exportParams}
              baseFilename="mandats"
            />
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
          columns={columns}
          data={filteredMandats}
          isLoading={isLoading}
          isEmpty={filteredMandats.length === 0}
        />
      </Card>

      {data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Total: {data.total} mandats</p>
        </div>
      )}
    </div>
  )
}
