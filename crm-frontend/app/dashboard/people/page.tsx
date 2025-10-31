'use client'

// app/dashboard/people/page.tsx
// ============= PEOPLE DIRECTORY =============

import React, { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { ArrowLeft, Eye, Edit, Trash2, Mail, Phone, MapPin, Briefcase, Download, UserPlus } from 'lucide-react'
import { usePeople } from '@/hooks/usePeople'
import { Card, Button, Alert } from '@/components/shared'
import { DataTable, Column, QuickAction, BulkAction } from '@/components/shared/DataTable'
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

  // Define columns for DataTable
  const columns: Column<Person>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Nom complet',
        accessor: (row) => `${row.first_name} ${row.last_name}`,
        sortable: true,
        searchable: true,
        render: (_, row) => (
          <Link
            href={`/dashboard/people/${personSlug(row.id, row.first_name, row.last_name)}`}
            className="font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
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
        render: (value) =>
          value ? (
            <div className="flex items-center gap-1 text-gray-700 dark:text-slate-300">
              <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" />
              <span className="text-sm">{value}</span>
            </div>
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
        render: (value) =>
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
        render: (value) =>
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
        render: (value) =>
          value ? (
            <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" />
              <span>{COUNTRY_LABELS[value] || value}</span>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-slate-500">-</span>
          ),
      },
      {
        id: 'language',
        header: 'Langue',
        accessor: 'language',
        sortable: true,
        render: (value) =>
          value ? (
            <span className="text-sm text-gray-700 dark:text-slate-300">
              {LANGUAGE_LABELS[value] || value}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-slate-500">-</span>
          ),
      },
    ],
    []
  )

  // Define quick actions (appear on row hover)
  const quickActions: QuickAction<Person>[] = useMemo(
    () => [
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
        onClick: (row) => {
          if (confirm(`Supprimer ${row.first_name} ${row.last_name} ?`)) {
            // TODO: Implement delete
            alert('Suppression à implémenter')
          }
        },
        variant: 'danger',
      },
    ],
    [router]
  )

  // Define bulk actions (appear when rows are selected)
  const bulkActions: BulkAction<Person>[] = useMemo(
    () => [
      {
        id: 'export',
        label: 'Exporter la sélection',
        icon: Download,
        onClick: async (rows) => {
          try {
            const personIds = rows.map(row => row.id).join(',')
            const url = `${process.env.NEXT_PUBLIC_API_URL}/exports/people/csv?ids=${personIds}`

            // Open download in new tab
            const link = document.createElement('a')
            link.href = url
            link.download = `people_export_${new Date().toISOString().split('T')[0]}.csv`
            link.click()

            alert(`Export de ${rows.length} personne(s) lancé`)
          } catch (error) {
            console.error('Export error:', error)
            alert('Erreur lors de l\'export')
          }
        },
      },
      {
        id: 'delete',
        label: 'Supprimer la sélection',
        icon: Trash2,
        onClick: async (rows) => {
          if (!confirm(`Supprimer ${rows.length} personne(s) ?\n\nCette action est irréversible.`)) {
            return
          }

          try {
            const personIds = rows.map(row => row.id)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/people/bulk-delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              },
              body: JSON.stringify(personIds),
            })

            if (!response.ok) {
              throw new Error('Erreur lors de la suppression')
            }

            const result = await response.json()

            if (result.failed > 0) {
              alert(`${result.deleted} personne(s) supprimée(s)\n${result.failed} échec(s)`)
            } else {
              alert(`${result.deleted} personne(s) supprimée(s) avec succès`)
            }

            // Refresh list
            fetchPeople(0, 200)
          } catch (error) {
            console.error('Bulk delete error:', error)
            alert('Erreur lors de la suppression en masse')
          }
        },
        variant: 'danger',
      },
    ],
    [fetchPeople]
  )

  // Fetch people from API
  useEffect(() => {
    fetchPeople(0, 200)
  }, [fetchPeople])

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
              📥 Importer
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

      {/* DataTable Premium */}
      <Card>
        <DataTable<Person>
          data={people.data?.items || []}
          columns={columns}
          keyExtractor={(row) => row.id}
          searchable={{
            placeholder: 'Rechercher une personne...',
            fields: ['first_name', 'last_name', 'personal_email', 'role'],
          }}
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
