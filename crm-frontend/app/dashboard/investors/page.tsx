// app/dashboard/investors/page.tsx
// ============= INVESTORS LIST PAGE =============
// MIGRATED: Uses new Organisation API instead of legacy Investor hooks

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useOrganisations } from '@/hooks/useOrganisations'
import { Card, Button, Table, Input, Alert, AdvancedFilters } from '@/components/shared'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

export default function InvestorsPage() {
  const { data: organisations, isLoading } = useOrganisations()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtersState, setFiltersState] = useState({
    country: '',
    language: '',
    createdFrom: '',
    createdTo: '',
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
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  const getCountryLabel = (code?: string | null) => {
    if (!code) return '-'
    const match = COUNTRY_OPTIONS.find(
      (option) => option.value === code || option.code === code
    )
    return match?.label ?? code
  }

  const getLanguageLabel = (code?: string | null) => {
    if (!code) return '-'
    const match = LANGUAGE_OPTIONS.find(
      (option) => option.value === code || option.code === code
    )
    return match?.label ?? code
  }

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
    },
    {
      header: 'Pays',
      accessor: 'country_code',
      render: (value: string | null) => getCountryLabel(value),
    },
    {
      header: 'Langue',
      accessor: 'language',
      render: (value: string | null) => getLanguageLabel(value),
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Société',
      accessor: 'company',
    },
    {
      header: 'Pipeline',
      accessor: 'pipeline_stage',
      render: (value: PipelineStage) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${PIPELINE_COLORS[value]}`}>
          {value.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/investors/${id}`} className="text-bleu hover:underline text-sm">
            Voir
          </Link>
        </div>
      ),
    },
  ]

  const advancedFilterDefinitions = [
    {
      key: 'country',
      label: 'Pays',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les pays' },
        ...COUNTRY_OPTIONS.filter((option) => option.value).map((option) => ({
          value: option.value,
          label: option.label,
        })),
      ],
    },
    {
      key: 'language',
      label: 'Langue',
      type: 'select' as const,
      options: [
        { value: '', label: 'Toutes les langues' },
        ...LANGUAGE_OPTIONS.filter((option) => option.code).map((option) => ({
          value: (option.code || '').toUpperCase(),
          label: `${option.flag} ${option.name}`,
        })),
      ],
    },
    {
      key: 'createdFrom',
      label: 'Créés après',
      type: 'date' as const,
    },
    {
      key: 'createdTo',
      label: 'Créés avant',
      type: 'date' as const,
    },
  ]

  const filteredInvestors = (organisations?.items ?? []).filter((org: any) => {
    const search = searchText.trim().toLowerCase()
    const matchesSearch =
      org.name.toLowerCase().includes(search) ||
      (org.email ?? '').toLowerCase().includes(search) ||
      (org.company ?? '').toLowerCase().includes(search)

    const matchesCountry = filtersState.country
      ? org.country_code === filtersState.country
      : true

    const matchesLanguage = filtersState.language
      ? (org.language || '').toUpperCase() === filtersState.language
      : true

    const createdAt = org.created_at ? new Date(org.created_at) : null
    const matchesCreatedFrom = filtersState.createdFrom
      ? createdAt && createdAt >= new Date(filtersState.createdFrom)
      : true
    const matchesCreatedTo = filtersState.createdTo
      ? createdAt && createdAt <= new Date(filtersState.createdTo)
      : true

    return (
      matchesSearch &&
      matchesCountry &&
      matchesLanguage &&
      matchesCreatedFrom &&
      matchesCreatedTo
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ardoise">Investisseurs</h1>
        <Link href="/dashboard/investors/new">
          <Button variant="primary">+ Nouvel investisseur</Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            placeholder="Rechercher par nom, email, société..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <AdvancedFilters
            filters={advancedFilterDefinitions}
            values={filtersState}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={filteredInvestors}
          isLoading={isLoading}
          isEmpty={filteredInvestors.length === 0}
        />
      </Card>

      {organisations && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Total: {organisations.total} organisations</p>
        </div>
      )}
    </div>
  )
}
