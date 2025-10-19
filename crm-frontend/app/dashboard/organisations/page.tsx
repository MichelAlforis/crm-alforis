// app/dashboard/organisations/page.tsx
// ============= ORGANISATIONS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrganisations } from '@/hooks/useOrganisations'
import { Card, Button, Table, Alert, AdvancedFilters, ExportButtons } from '@/components/shared'
import SearchBar from '@/components/search/SearchBar'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { OrganisationCategory } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  DISTRIBUTEUR: 'Distributeur',
  EMETTEUR: 'Émetteur',
  FOURNISSEUR_SERVICE: 'Fournisseur de service',
  PARTENAIRE: 'Partenaire',
  AUTRE: 'Autre',
  Institution: 'Institution',
  Wholesale: 'Wholesale',
  SDG: 'SDG',
  CGPI: 'CGPI',
  Autres: 'Autres',
}

export default function OrganisationsPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [filtersState, setFiltersState] = useState({
    category: '',
    status: '',
    country: '',
    language: '',
    createdFrom: '',
    createdTo: '',
  })

  const handleFilterChange = (key: string, value: unknown) => {
    if (Array.isArray(value)) {
      return
    }
    setFiltersState((prev) => ({
      ...prev,
      [key]: value as string,
    }))
  }

  const resetFilters = () =>
    setFiltersState({
      category: '',
      status: '',
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    })

  const { data, isLoading, error } = useOrganisations({
    limit: 100,
    category: filtersState.category || undefined,
    is_active:
      filtersState.status === ''
        ? undefined
        : filtersState.status === 'active',
    country_code: filtersState.country || undefined,
    language: filtersState.language || undefined,
  })

  const getCountryLabel = (code?: string | null) => {
    if (!code) return '-'
    const country = COUNTRY_OPTIONS.find((option) => option.code === code)
    return country ? `${country.flag} ${country.name}` : code
  }

  const getLanguageLabel = (code?: string | null) => {
    if (!code) return '-'
    const lang = LANGUAGE_OPTIONS.find((option) => option.code === code)
    return lang ? `${lang.flag} ${lang.name}` : code
  }

  const exportParams = {
    category: filtersState.category || undefined,
    is_active:
      filtersState.status === ''
        ? undefined
        : filtersState.status === 'active'
          ? 'true'
          : 'false',
    country: filtersState.country || undefined,
  }

  const advancedFilterDefinitions = [
    {
      key: 'category',
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: '', label: 'Toutes les catégories' },
        ...Object.keys(CATEGORY_LABELS).map((value) => ({
          value,
          label: CATEGORY_LABELS[value],
        })),
      ],
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les statuts' },
        { value: 'active', label: 'Actives' },
        { value: 'inactive', label: 'Inactives' },
      ],
    },
    {
      key: 'country',
      label: 'Pays',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les pays' },
        ...COUNTRY_OPTIONS.filter((option) => option.code).map((option) => ({
          value: option.code,
          label: `${option.flag} ${option.name}`,
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
          value: option.code,
          label: `${option.flag} ${option.name}`,
        })),
      ],
    },
    {
      key: 'createdFrom',
      label: 'Créées après',
      type: 'date' as const,
    },
    {
      key: 'createdTo',
      label: 'Créées avant',
      type: 'date' as const,
    },
  ]

  const filteredData = data?.items.filter((org) => {
    const search = searchText.toLowerCase()
    const matchesSearch =
      org.name.toLowerCase().includes(search) ||
      org.email?.toLowerCase().includes(search) ||
      ''

    const matchesCategory = filtersState.category
      ? org.category === filtersState.category
      : true

    const matchesStatus =
      filtersState.status === ''
        ? true
        : filtersState.status === 'active'
          ? org.is_active
          : !org.is_active

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
      matchesCategory &&
      matchesStatus &&
      matchesCountry &&
      matchesLanguage &&
      matchesCreatedFrom &&
      matchesCreatedTo
    )
  })

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
    },
    {
      header: 'Catégorie',
      accessor: 'category',
      render: (value: OrganisationCategory) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
          {CATEGORY_LABELS[value]}
        </span>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (value: string | null) => value || '-',
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
      header: 'Statut',
      accessor: 'is_active',
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <Link
          href={`/dashboard/organisations/${id}`}
          className="text-bleu hover:underline text-sm"
        >
          Voir
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ardoise">Organisations</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/organisations/import">
            <Button variant="secondary">📥 Importer</Button>
          </Link>
          <Link href="/dashboard/organisations/new">
            <Button variant="primary">+ Nouvelle organisation</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchBar
              placeholder="Rechercher une organisation…"
              entityType="organisations"
              onQueryChange={setSearchText}
              onSubmit={setSearchText}
              onSelectSuggestion={(suggestion) => {
                if (suggestion?.id) {
                  router.push(`/dashboard/organisations/${suggestion.id}`)
                }
              }}
            />
            <ExportButtons
              resource="organisations"
              params={exportParams}
              baseFilename="organisations"
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
          data={filteredData || []}
          isLoading={isLoading}
          isEmpty={!filteredData || filteredData.length === 0}
        />
      </Card>

      {data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Total: {filteredData?.length || 0} / {data.total} organisations
          </p>
        </div>
      )}
    </div>
  )
}
