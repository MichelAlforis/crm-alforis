'use client'

// app/dashboard/people/page.tsx
// ============= PEOPLE DIRECTORY =============

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { usePeople } from '@/hooks/usePeople'
import { useTableColumns } from '@/hooks/useTableColumns'
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

export default function PeoplePage() {
  const router = useRouter()
  const { people, fetchPeople } = usePeople()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [limit, setLimit] = useState(50)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | undefined>()
  const [filtersState, setFiltersState] = useState({
    role: '',
    country: '',
    language: '',
    createdFrom: '',
    createdTo: '',
  })

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

  const handleFilterChange = (key: string, value: unknown) => {
    if (Array.isArray(value)) return
    setFiltersState((prev) => ({
      ...prev,
      [key]: value as string,
    }))
  }

  const resetFilters = () =>
    setFiltersState({
      role: '',
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    })

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        // Toggle direction
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      // New sort key
      return { key, direction: 'asc' }
    })
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    fetchPeople(skip, limit, debouncedSearch ? { q: debouncedSearch } : undefined)
  }, [debouncedSearch, skip, limit, fetchPeople])

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

  const filteredPeople = (people.data?.items ?? [])
    .filter((person) => {
      const matchesSearch =
        `${person.first_name} ${person.last_name}`.toLowerCase().includes(
          searchText.toLowerCase()
        ) ||
        person.personal_email?.toLowerCase().includes(searchText.toLowerCase()) ||
        person.role?.toLowerCase().includes(searchText.toLowerCase()) ||
        ''

      const matchesRole = filtersState.role
        ? person.role?.toLowerCase().includes(filtersState.role.toLowerCase())
        : true

      const matchesCountry = filtersState.country
        ? person.country_code === filtersState.country
        : true

      const matchesLanguage = filtersState.language
        ? (person.language || '').toUpperCase() === filtersState.language
        : true

      const createdAt = person.created_at ? new Date(person.created_at) : null
      const matchesCreatedFrom = filtersState.createdFrom
        ? createdAt && createdAt >= new Date(filtersState.createdFrom)
        : true

      const matchesCreatedTo = filtersState.createdTo
        ? createdAt && createdAt <= new Date(filtersState.createdTo)
        : true

      return (
        matchesSearch &&
        matchesRole &&
        matchesCountry &&
        matchesLanguage &&
        matchesCreatedFrom &&
        matchesCreatedTo
      )
    })
    .sort((a, b) => {
      if (!sortConfig) return 0

      const aValue = a[sortConfig.key as keyof Person]
      const bValue = b[sortConfig.key as keyof Person]

      // Handle null/undefined values
      if (!aValue && !bValue) return 0
      if (!aValue) return 1
      if (!bValue) return -1

      // String comparison (case insensitive)
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()

      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
      }
    })

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
              onQueryChange={setSearchText}
              onSubmit={setSearchText}
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
                params={{}}
                baseFilename="personnes"
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
      {people.error && <Alert type="error" message={people.error} />}

      <Card>
        <Table
          columns={visibleColumns}
          data={filteredPeople}
          isLoading={people.isLoading}
          isEmpty={filteredPeople.length === 0}
          sortConfig={sortConfig}
          onSort={handleSort}
          pagination={{
            total: people.data?.total || 0,
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
