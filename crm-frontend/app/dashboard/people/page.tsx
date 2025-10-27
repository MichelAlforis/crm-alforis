'use client'

// app/dashboard/people/page.tsx
// ============= PEOPLE DIRECTORY =============

import React, { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { usePeople } from '@/hooks/usePeople'
import { useTableColumns } from '@/hooks/useTableColumns'
import { useClientSideTable } from '@/hooks/useClientSideTable'
import { useFilters } from '@/hooks/useFilters'
import { usePagination } from '@/hooks/usePagination'
import { Card, Button, Table, Alert, AdvancedFilters, ColumnSelector, ExportButtons } from '@/components/shared'
import SearchBar from '@/components/search/SearchBar'
import { Person } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { personSlug } from '@/lib/utils'

const COUNTRY_LABELS = COUNTRY_OPTIONS.filter((option) => option.value).reduce(
  (acc, option) => {
    acc[option.value] = option.label
    if (option.code) {
      acc[option.code] = option.label
    }
    return acc
  },
  {} as Record<string, string>,
)

const LANGUAGE_LABELS = LANGUAGE_OPTIONS.filter((option) => option.value).reduce(
  (acc, option) => {
    acc[option.value] = option.label
    if (option.code) {
      acc[option.code] = option.label
    }
    return acc
  },
  {} as Record<string, string>,
)

interface PeopleFilters {
  role: string
  country: string
  language: string
  createdFrom: string
  createdTo: string
}

export default function PeoplePage() {
  const router = useRouter()
  const { people, fetchPeople } = usePeople()

  // Pagination hook
  const pagination = usePagination({ initialLimit: 20 })

  // Use new hooks for cleaner state management
  const filters = useFilters<PeopleFilters>({
    initialValues: {
      role: '',
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    },
  })

  // Export parameters matching backend API
  const exportParams = {
    role: filters.values.role || undefined,
    country_code: filters.values.country || undefined,
    language: filters.values.language || undefined,
  }

  const table = useClientSideTable<Person, PeopleFilters>({
    data: people.data?.items || [],
    searchFields: ['first_name', 'last_name', 'personal_email', 'role'],
    defaultSortKey: 'last_name',
    defaultSortDirection: 'asc',
    filterFn: (person, activeFilters) => {
      if (activeFilters.role && !person.role?.toLowerCase().includes(activeFilters.role.toLowerCase())) {
        return false
      }
      if (activeFilters.country && person.country_code !== activeFilters.country) {
        return false
      }
      if (activeFilters.language && (person.language || '').toUpperCase() !== activeFilters.language) {
        return false
      }
      const createdAt = person.created_at ? new Date(person.created_at) : null
      if (activeFilters.createdFrom && createdAt && createdAt < new Date(activeFilters.createdFrom)) {
        return false
      }
      if (activeFilters.createdTo && createdAt && createdAt > new Date(activeFilters.createdTo)) {
        return false
      }
      return true
    },
  })

  // Sync table filters with filter hook
  useEffect(() => {
    table.setFilters(filters.activeFilters as PeopleFilters)
  }, [filters.activeFilters])

  // Define columns with useTableColumns hook
  const defaultColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nom',
        accessor: 'last_name',
        visible: true,
        sortable: true,
        render: (_: string, row: Person) => (
          <Link
            href={`/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}`}
            className="text-bleu hover:underline text-sm font-medium"
          >
            {`${row.first_name} ${row.last_name}`}
          </Link>
        ),
      },
      {
        key: 'role',
        header: 'Rôle',
        accessor: 'role',
        visible: true,
        sortable: true,
      },
      {
        key: 'email',
        header: 'Email',
        accessor: 'personal_email',
        visible: true,
        sortable: true,
      },
      {
        key: 'mobile',
        header: 'Mobile',
        accessor: 'personal_phone',
        visible: false,
        sortable: true,
      },
      {
        key: 'country',
        header: 'Pays',
        accessor: 'country_code',
        visible: true,
        sortable: true,
        render: (value: string | null | undefined) =>
          value ? COUNTRY_LABELS[value] || value : '-',
      },
      {
        key: 'language',
        header: 'Langue',
        accessor: 'language',
        visible: false,
        sortable: true,
        render: (value: string | null | undefined) =>
          value ? LANGUAGE_LABELS[value] || value : '-',
      },
    ],
    [],
  )

  const { visibleColumns, toggleColumn, resetColumns } = useTableColumns({
    storageKey: 'people-columns',
    defaultColumns,
  })

  // Fetch people from API (server-side pagination)
  useEffect(() => {
    fetchPeople(0, 200) // API max limit is 200
  }, [fetchPeople])

  const advancedFilterDefinitions = [
    {
      key: 'role',
      label: 'Rôle contient',
      type: 'search' as const,
      placeholder: 'Directeur, Analyste...',
    },
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
          value: option.code,
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
          <h1 className="text-3xl font-bold text-ardoise">Personnes physiques</h1>
          <p className="text-sm text-gray-500 mt-1">
            Annuaire centralisé des interlocuteurs et décisionnaires.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/people/import">
            <Button variant="secondary">📥 Importer</Button>
          </Link>
          <Link href="/dashboard/people/new">
            <Button variant="primary">+ Nouvelle personne</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchBar
              placeholder="Rechercher une personne…"
              entityType="people"
              onQueryChange={table.setSearchQuery}
              onSubmit={table.setSearchQuery}
              onSelectSuggestion={(suggestion) => {
                if (suggestion?.id) {
                  router.push(`/dashboard/people/${suggestion.id}`)
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
                resource="people"
                params={exportParams}
                baseFilename="personnes"
              />
            </div>
          </div>
          <AdvancedFilters
            filters={advancedFilterDefinitions}
            values={filters.values}
            onChange={filters.handleChange}
            onReset={filters.reset}
          />
        </div>
      </Card>
      {people.error && <Alert type="error" message={people.error} />}

      <Card>
        <Table
          columns={visibleColumns}
          data={table.filteredData.slice(pagination.skip, pagination.skip + pagination.limit)}
          isLoading={people.isLoading}
          isEmpty={table.filteredData.length === 0}
          sortConfig={table.sortConfig}
          onSort={table.handleSort}
          pagination={{
            total: table.filteredData.length,
            skip: pagination.skip,
            limit: pagination.limit,
            onPageChange: pagination.setSkip,
            onLimitChange: pagination.setLimit,
          }}
        />
      </Card>
    </div>
  )
}
