'use client'

// app/dashboard/people/page.tsx
// ============= PEOPLE DIRECTORY =============

import React, { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Edit, Trash2, Mail, Phone, MapPin, Briefcase } from 'lucide-react'
import { usePeople } from '@/hooks/usePeople'
import { useClientSideTable } from '@/hooks/useClientSideTable'
import { useFilters } from '@/hooks/useFilters'
import { usePagination } from '@/hooks/usePagination'
import { Card, Button, Alert, AdvancedFilters, ExportButtons } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
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

  // Define columns for TableV2
  const columns: ColumnV2<Person>[] = useMemo(
    () => [
      {
        header: 'Nom',
        accessor: 'last_name',
        sortable: true,
        sticky: 'left',
        priority: 'high',
        minWidth: '200px',
        render: (_: string, row: Person) => (
          <Link
            href={`/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}`}
            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
          >
            {`${row.first_name} ${row.last_name}`}
          </Link>
        ),
      },
      {
        header: 'Rôle',
        accessor: 'role',
        sortable: true,
        priority: 'high',
        render: (value: string | null) => value ? (
          <div className="flex items-center gap-1 text-gray-700">
            <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="text-sm">{value}</span>
          </div>
        ) : <span className="text-gray-400">-</span>,
      },
      {
        header: 'Email',
        accessor: 'personal_email',
        sortable: true,
        priority: 'high',
        maxWidth: '280px',
        render: (value: string | null) => value ? (
          <a
            href={`mailto:${value}`}
            className="flex items-center gap-1 min-w-0 text-blue-600 hover:text-blue-700 hover:underline"
            title={value}
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate block min-w-0">{value}</span>
          </a>
        ) : <span className="text-gray-400">-</span>,
      },
      {
        header: 'Mobile',
        accessor: 'personal_phone',
        sortable: true,
        priority: 'medium',
        render: (value: string | null) => value ? (
          <a
            href={`tel:${value}`}
            className="flex items-center gap-1 text-gray-700 hover:text-gray-900"
          >
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{value}</span>
          </a>
        ) : <span className="text-gray-400">-</span>,
      },
      {
        header: 'Pays',
        accessor: 'country_code',
        sortable: true,
        priority: 'medium',
        render: (value: string | null | undefined) => value ? (
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span>{COUNTRY_LABELS[value] || value}</span>
          </div>
        ) : <span className="text-gray-400">-</span>,
      },
      {
        header: 'Langue',
        accessor: 'language',
        sortable: true,
        priority: 'low',
        render: (value: string | null | undefined) => value ? (
          <span className="text-sm">{LANGUAGE_LABELS[value] || value}</span>
        ) : <span className="text-gray-400">-</span>,
      },
      {
        header: 'Actions',
        accessor: 'id',
        sticky: 'right',
        priority: 'high',
        minWidth: '120px',
        render: (value: number, row: Person) => {
          const actions: OverflowAction[] = [
            {
              label: 'Voir',
              icon: Eye,
              onClick: () => router.push(`/dashboard/people/${personSlug(value, row.first_name, row.last_name)}`),
              variant: 'default'
            },
            {
              label: 'Modifier',
              icon: Edit,
              onClick: () => router.push(`/dashboard/people/${personSlug(value, row.first_name, row.last_name)}?edit=true`),
              variant: 'default'
            },
            {
              label: 'Supprimer',
              icon: Trash2,
              onClick: () => {
                if (confirm(`Supprimer ${row.first_name} ${row.last_name} ?`)) {
                  // TODO: Implement delete
                  alert('Suppression à implémenter')
                }
              },
              variant: 'danger'
            }
          ]

          return <OverflowMenu actions={actions} />
        }
      },
    ],
    [router]
  )

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
        <TableV2<Person>
          columns={columns}
          data={table.filteredData.slice(pagination.skip, pagination.skip + pagination.limit)}
          isLoading={people.isLoading}
          isEmpty={table.filteredData.length === 0}
          emptyMessage="Aucune personne trouvée"
          sortConfig={table.sortConfig}
          onSort={table.handleSort}
          getRowKey={(row) => row.id}
          size="md"
          variant="default"
          stickyHeader
        />

        {/* Pagination */}
        {table.filteredData.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Affichage {pagination.skip + 1} à {Math.min(pagination.skip + pagination.limit, table.filteredData.length)} sur {table.filteredData.length} personnes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.setSkip(Math.max(0, pagination.skip - pagination.limit))}
                disabled={pagination.skip === 0}
              >
                Précédent
              </Button>
              <div className="text-sm text-gray-600">
                Page {Math.floor(pagination.skip / pagination.limit) + 1} / {Math.ceil(table.filteredData.length / pagination.limit)}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.setSkip(pagination.skip + pagination.limit)}
                disabled={pagination.skip + pagination.limit >= table.filteredData.length}
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
