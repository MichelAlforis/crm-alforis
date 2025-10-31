'use client'

/**
 * Example implementation of the new DataTable component
 * This shows how to migrate from TableV2 to the premium DataTable
 */

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from "@/lib/constants"
import { ArrowLeft, Eye, Edit, Trash2, Mail, Phone, Download, UserPlus, Upload } from 'lucide-react'
import { usePeople } from '@/hooks/usePeople'
import { Card, Button, Alert } from '@/components/shared'
import { DataTable, Column, QuickAction, BulkAction } from '@/components/shared/DataTable'
import { Person } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { personSlug } from '@/lib/utils'
import { logger } from '@/lib/logger'

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

export default function PeoplePageExample() {
  const router = useRouter()
  const { people, fetchPeople, deletePerson } = usePeople()

  // Fetch people from API
  useEffect(() => {
    fetchPeople(0, 200)
  }, [fetchPeople])

  // Define columns for DataTable
  const columns: Column<Person>[] = [
    {
      id: 'name',
      header: 'Nom complet',
      accessor: (row) => `${row.first_name} ${row.last_name}`,
      sortable: true,
      searchable: true,
      render: (_: unknown, row: any) => (
        <Link
          href={`/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}`}
          className="font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {`${row.first_name} ${row.last_name}`}
        </Link>
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      accessor: 'role',
      sortable: true,
      searchable: true,
      render: (value: any) =>
        value ? (
          <span className="text-sm text-gray-700 dark:text-slate-300">{value}</span>
        ) : (
          <span className="text-gray-400 dark:text-slate-500">-</span>
        ),
    },
    {
      id: 'email',
      header: 'Email',
      accessor: 'personal_email',
      sortable: true,
      searchable: true,
      render: (value: any) =>
        value ? (
          <a
            href={`mailto:${value}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{value}</span>
          </a>
        ) : (
          <span className="text-gray-400 dark:text-slate-500">-</span>
        ),
    },
    {
      id: 'phone',
      header: 'Téléphone',
      accessor: 'personal_phone',
      sortable: true,
      render: (value: any) =>
        value ? (
          <a
            href={`tel:${value}`}
            className="text-sm text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{value}</span>
          </a>
        ) : (
          <span className="text-gray-400 dark:text-slate-500">-</span>
        ),
    },
    {
      id: 'country',
      header: 'Pays',
      accessor: 'country_code',
      sortable: true,
      render: (value: any) =>
        value ? (
          <span className="text-sm text-gray-700 dark:text-slate-300">
            {COUNTRY_LABELS[value] || value}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-slate-500">-</span>
        ),
    },
    {
      id: 'language',
      header: 'Langue',
      accessor: 'language',
      sortable: true,
      render: (value: any) =>
        value ? (
          <span className="text-sm text-gray-700 dark:text-slate-300">
            {LANGUAGE_LABELS[value] || value}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-slate-500">-</span>
        ),
    },
  ]

  // Define quick actions (appear on row hover)
  const quickActions: QuickAction<Person>[] = [
    {
      id: 'view',
      label: 'Voir',
      icon: Eye,
      onClick: (row) => {
        router.push(`/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}`)
      },
    },
    {
      id: 'edit',
      label: 'Modifier',
      icon: Edit,
      onClick: (row) => {
        router.push(
          `/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}?edit=true`
        )
      },
    },
    {
      id: 'delete',
      label: 'Supprimer',
      icon: Trash2,
      onClick: async (row) => {
        if (confirm(`Supprimer ${row.first_name} ${row.last_name} ?`)) {
          try {
            await deletePerson(row.id)
            fetchPeople(0, 200) // Refresh list
          } catch (_error) {
            alert('Erreur lors de la suppression')
          }
        }
      },
      variant: 'danger',
    },
  ]

  // Define bulk actions (appear when rows are selected)
  const bulkActions: BulkAction<Person>[] = [
    {
      id: 'export',
      label: 'Exporter la sélection',
      icon: Download,
      onClick: (rows) => {
        logger.info('Exporting selected people (example)', { count: rows.length, rows })
        // TODO: Implement CSV export
        alert(`Export de ${rows.length} personnes (à implémenter)`)
      },
    },
    {
      id: 'delete',
      label: 'Supprimer la sélection',
      icon: Trash2,
      onClick: async (rows) => {
        if (confirm(`Supprimer ${rows.length} personne(s) ?`)) {
          try {
            await Promise.all(rows.map((row) => deletePerson(row.id)))
            fetchPeople(0, 200) // Refresh list
          } catch (_error) {
            alert('Erreur lors de la suppression')
          }
        }
      },
      variant: 'danger',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Retour à l'annuaire</span>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            Personnes physiques
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Annuaire centralisé des interlocuteurs et décisionnaires.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/people/import">
            <Button variant="secondary">
              <Upload className="w-4 h-4" />
              Importer
            </Button>
          </Link>
          <Link href="/dashboard/people/new">
            <Button variant="primary">
              <UserPlus className="w-4 h-4" />
              Nouvelle personne
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {people.error && <Alert type="error" message={people.error} />}

      {/* DataTable - Premium */}
      <Card>
        <DataTable<Person>
          data={people.data?.items || []}
          columns={columns}
          keyExtractor={(row) => row.id}
          searchable={{
            placeholder: 'Rechercher une personne...',
            fields: ['first_name', 'last_name', 'personal_email', 'role'],
          }}
          filterable={false} // Advanced filters can be added later
          bulkActions={bulkActions}
          quickActions={quickActions}
          onRowClick={(row) => {
            router.push(`/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}`)
          }}
          isLoading={people.isLoading}
          isEmpty={!people.data?.items || people.data.items.length === 0}
          emptyState={{
            title: 'Aucune personne',
            description: 'Commencez par ajouter votre première personne.',
            action: {
              label: 'Nouvelle personne',
              onClick: () => router.push(ROUTES.CRM.PERSON_NEW),
            },
          }}
          pagination={{
            pageSize: 20,
            showPageSize: true,
            pageSizeOptions: [10, 20, 50, 100],
          }}
        />
      </Card>
    </div>
  )
}
