// app/dashboard/organisations/page.tsx
// ============= ORGANISATIONS LIST PAGE =============
// Updated: Pagination with fun design

'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useFilters } from '@/hooks/useFilters'
import { usePagination } from '@/hooks/usePagination'
import { Card, Button, Alert, AdvancedFilters, ExportButtons } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import SearchBar from '@/components/search/SearchBar'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { OrganisationCategory, Organisation } from '@/lib/types'
import { Eye, Edit, Trash2, Mail, Phone, Globe } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  Institution: 'Institution',
  Wholesale: 'Wholesale',
  SDG: 'SDG',
  CGPI: 'CGPI',
  Startup: 'Startup',
  Corporation: 'Corporation',
  Autres: 'Autres',
}

interface OrganisationFilters {
  category: string
  status: string
  country: string
  language: string
  createdFrom: string
  createdTo: string
}

export default function OrganisationsPage() {
  const router = useRouter()

  // Local state for search and sorting
  const [searchText, setSearchText] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  })

  // Use pagination hook
  const pagination = usePagination({ initialLimit: 20 })

  // Use new useFilters hook for cleaner state management
  const filters = useFilters<OrganisationFilters>({
    initialValues: {
      category: '',
      status: '',
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    },
  })

  const { data, isLoading, error } = useOrganisations({
    skip: 0,
    limit: 200, // API max limit is 200
    category: filters.values.category || undefined,
    is_active:
      filters.values.status === ''
        ? undefined
        : filters.values.status === 'active',
    country_code: filters.values.country || undefined,
    language: filters.values.language || undefined,
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
    category: filters.values.category || undefined,
    is_active:
      filters.values.status === ''
        ? undefined
        : filters.values.status === 'active',
    country_code: filters.values.country || undefined,
    language: filters.values.language || undefined,
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

  // Define columns for TableV2
  const columns: ColumnV2<Organisation>[] = useMemo(
    () => [
      {
        header: 'Nom',
        accessor: 'name',
        sortable: true,
        sticky: 'left',
        priority: 'high',
        minWidth: '200px',
        render: (value: string, row: Organisation) => (
          <Link
            href={`/dashboard/organisations/${row.id}`}
            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
          >
            {value}
          </Link>
        )
      },
      {
        header: 'Catégorie',
        accessor: 'category',
        sortable: true,
        priority: 'high',
        render: (value: OrganisationCategory | null) =>
          value ? (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              {CATEGORY_LABELS[value] || value}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          ),
      },
      {
        header: 'Email',
        accessor: 'email',
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
        header: 'Téléphone',
        accessor: 'main_phone',
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
        render: (value: string | null) => (
          <span className="text-sm">{getCountryLabel(value)}</span>
        ),
      },
      {
        header: 'Langue',
        accessor: 'language',
        sortable: true,
        priority: 'low',
        render: (value: string | null) => (
          <span className="text-sm">{getLanguageLabel(value)}</span>
        ),
      },
      {
        header: 'Site web',
        accessor: 'website',
        sortable: true,
        priority: 'low',
        maxWidth: '200px',
        render: (value: string | null) =>
          value ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 min-w-0 text-blue-600 hover:text-blue-700 hover:underline"
              title={value}
            >
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate block min-w-0 text-xs">{value}</span>
            </a>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        header: 'Statut',
        accessor: 'is_active',
        sortable: true,
        priority: 'high',
        render: (value: boolean) => (
          <span
            className={`px-2 py-1 text-xs rounded-full font-medium ${
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
        sticky: 'right',
        priority: 'high',
        minWidth: '120px',
        render: (value: number, row: Organisation) => {
          const actions: OverflowAction[] = [
            {
              label: 'Voir',
              icon: Eye,
              onClick: () => router.push(`/dashboard/organisations/${value}`),
              variant: 'default'
            },
            {
              label: 'Modifier',
              icon: Edit,
              onClick: () => router.push(`/dashboard/organisations/${value}?edit=true`),
              variant: 'default'
            },
            {
              label: 'Supprimer',
              icon: Trash2,
              onClick: () => {
                if (confirm(`Supprimer l'organisation "${row.name}" ?`)) {
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

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered =
      data?.items?.filter((org) => {
        const search = searchText.toLowerCase()
        const matchesSearch =
          org.name.toLowerCase().includes(search) ||
          org.email?.toLowerCase().includes(search) ||
          ''

        const matchesCategory = filters.values.category
          ? org.category === filters.values.category
          : true

        const matchesStatus =
          filters.values.status === ''
            ? true
            : filters.values.status === 'active'
              ? org.is_active
              : !org.is_active

        const matchesCountry = filters.values.country
          ? org.country_code === filters.values.country
          : true

        const matchesLanguage = filters.values.language
          ? (org.language || '').toUpperCase() === filters.values.language
          : true

        const createdAt = org.created_at ? new Date(org.created_at) : null
        const matchesCreatedFrom = filters.values.createdFrom
          ? createdAt && createdAt >= new Date(filters.values.createdFrom)
          : true

        const matchesCreatedTo = filters.values.createdTo
          ? createdAt && createdAt <= new Date(filters.values.createdTo)
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
      }) || []

    // Sort the filtered data
    return [...filtered].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key]
      const bValue = (b as any)[sortConfig.key]

      // Handle null/undefined values
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Handle boolean values
      if (typeof aValue === 'boolean') {
        return sortConfig.direction === 'asc'
          ? aValue === bValue
            ? 0
            : aValue
              ? -1
              : 1
          : aValue === bValue
            ? 0
            : aValue
              ? 1
              : -1
      }

      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [data?.items, searchText, filters.values, sortConfig])

  // Paginate the filtered and sorted data (client-side pagination)
  const paginatedData = useMemo(() => {
    const sliced = filteredAndSortedData.slice(pagination.skip, pagination.skip + pagination.limit)
    console.log('🎯 PAGINATION:', {
      total: filteredAndSortedData.length,
      skip: pagination.skip,
      limit: pagination.limit,
      showing: sliced.length,
      page: Math.floor(pagination.skip / pagination.limit) + 1
    })
    return sliced
  }, [filteredAndSortedData, pagination.skip, pagination.limit])

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Annuaire</span>
          </Link>
          <span className="text-gray-400">•</span>
          <h1 className="text-3xl font-bold text-ardoise">Organisations</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/organisations/import">
            <Button variant="secondary">Importer</Button>
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
            <div className="flex gap-2">
              <ExportButtons
                resource="organisations"
                params={exportParams}
                baseFilename="organisations"
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

      {error && <Alert type="error" message={error.message || 'Erreur de chargement'} />}

      <Card>
        <TableV2<Organisation>
          columns={columns}
          data={paginatedData || []}
          isLoading={isLoading}
          isEmpty={!filteredAndSortedData || filteredAndSortedData.length === 0}
          emptyMessage="Aucune organisation trouvée"
          sortConfig={sortConfig}
          onSort={handleSort}
          getRowKey={(row) => row.id}
          size="md"
          variant="default"
          stickyHeader
        />

        {/* Pagination */}
        {filteredAndSortedData.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Affichage {pagination.skip + 1} à {Math.min(pagination.skip + pagination.limit, filteredAndSortedData.length)} sur {filteredAndSortedData.length} organisations
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
                Page {Math.floor(pagination.skip / pagination.limit) + 1} / {Math.ceil(filteredAndSortedData.length / pagination.limit)}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.setSkip(pagination.skip + pagination.limit)}
                disabled={pagination.skip + pagination.limit >= filteredAndSortedData.length}
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
