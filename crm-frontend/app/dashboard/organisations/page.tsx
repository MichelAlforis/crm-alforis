// app/dashboard/organisations/page.tsx
// ============= ORGANISATIONS LIST PAGE =============

'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from "@/lib/constants"
import { ArrowLeft, Eye, Edit, Trash2, Mail, Phone, Globe, Download, Building } from 'lucide-react'
import { useOrganisations } from '@/hooks/useOrganisations'
import { Card, Button, Alert, PageContainer, PageHeader, PageSection } from '@/components/shared'
import { DataTable, Column, QuickAction, BulkAction } from '@/components/shared/DataTable'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { OrganisationCategory, Organisation } from '@/lib/types'
import { ORGANISATION_CATEGORY_LABELS } from '@/lib/enums/labels'

export default function OrganisationsPage() {
  const router = useRouter()

  const { data, isLoading, error } = useOrganisations({
    skip: 0,
    limit: 200,
  })

  const getCountryLabel = (code?: string | null) => {
    if (!code) return null
    const country = COUNTRY_OPTIONS.find((option: any) => option.code === code)
    return country ? `${country.flag} ${country.name}` : code
  }

  const getLanguageLabel = (code?: string | null) => {
    if (!code) return null
    const lang = LANGUAGE_OPTIONS.find((option: any) => option.code === code)
    return lang ? `${lang.flag} ${lang.name}` : code
  }

  // Define columns for DataTable
  const columns: Column<Organisation>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Nom',
        accessor: 'name',
        priority: 'high',
        sortable: true,
        searchable: true,
        render: (value: unknown, row: any) => (
          <Link
            href={`/dashboard/organisations/${row.id}`}
            className="font-medium text-text-primary dark:text-text-primary hover:text-primary dark:hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </Link>
        ),
      },
      {
        id: 'category',
        header: 'Catégorie',
        accessor: 'category',
        priority: 'high',
        sortable: true,
        searchable: true,
        render: (value: OrganisationCategory | null) =>
          value ? (
            <span className="px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-fluid-xs rounded-full font-medium">
              {ORGANISATION_CATEGORY_LABELS[value] || value}
            </span>
          ) : (
            <span className="text-text-disabled dark:text-text-disabled">-</span>
          ),
      },
      {
        id: 'email',
        header: 'Email',
        accessor: 'email',
        priority: 'medium',
        sortable: true,
        searchable: true,
        render: (value: any) =>
          value ? (
            <a
              href={`mailto:${value}`}
              className="text-fluid-sm text-primary dark:text-primary hover:underline flex items-center gap-spacing-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{value}</span>
            </a>
          ) : (
            <span className="text-text-disabled dark:text-text-disabled">-</span>
          ),
      },
      {
        id: 'phone',
        header: 'Téléphone',
        accessor: 'main_phone',
        priority: 'medium',
        sortable: true,
        render: (value: any) =>
          value ? (
            <a
              href={`tel:${value}`}
              className="text-fluid-sm text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary flex items-center gap-spacing-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{value}</span>
            </a>
          ) : (
            <span className="text-text-disabled dark:text-text-disabled">-</span>
          ),
      },
      {
        id: 'country',
        header: 'Pays',
        accessor: 'country_code',
        priority: 'high',
        sortable: true,
        render: (value: any) => {
          const label = getCountryLabel(value)
          return label ? (
            <span className="text-fluid-sm text-text-secondary dark:text-text-secondary">{label}</span>
          ) : (
            <span className="text-text-disabled dark:text-text-disabled">-</span>
          )
        },
      },
      {
        id: 'language',
        header: 'Langue',
        accessor: 'language',
        priority: 'low',
        sortable: true,
        render: (value: any) => {
          const label = getLanguageLabel(value)
          return label ? (
            <span className="text-fluid-sm text-text-secondary dark:text-text-secondary">{label}</span>
          ) : (
            <span className="text-text-disabled dark:text-text-disabled">-</span>
          )
        },
      },
      {
        id: 'website',
        header: 'Site web',
        accessor: 'website',
        priority: 'low',
        sortable: true,
        render: (value: any) =>
          value ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fluid-sm text-primary dark:text-primary hover:underline flex items-center gap-spacing-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate text-fluid-xs">{value}</span>
            </a>
          ) : (
            <span className="text-text-disabled dark:text-text-disabled">-</span>
          ),
      },
      {
        id: 'status',
        header: 'Statut',
        accessor: 'is_active',
        priority: 'high',
        sortable: true,
        render: (value: boolean) => (
          <span
            className={`px-2 py-1 text-fluid-xs rounded-full font-medium ${
              value
                ? 'bg-success/10 dark:bg-success/20 text-success dark:text-success-light'
                : 'bg-surface-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-secondary'
            }`}
          >
            {value ? 'Active' : 'Inactive'}
          </span>
        ),
      },
    ],
    []
  )

  // Define quick actions (appear on row hover)
  const quickActions: QuickAction<Organisation>[] = useMemo(
    () => [
      {
        id: 'view',
        label: 'Voir',
        icon: Eye,
        onClick: (row) => {
          router.push(`/dashboard/organisations/${row.id}`)
        },
      },
      {
        id: 'edit',
        label: 'Modifier',
        icon: Edit,
        onClick: (row) => {
          router.push(`/dashboard/organisations/${row.id}?edit=true`)
        },
      },
      {
        id: 'delete',
        label: 'Supprimer',
        icon: Trash2,
        onClick: (row) => {
          if (confirm(`Supprimer l'organisation "${row.name}" ?`)) {
            alert('Suppression à implémenter')
          }
        },
        variant: 'danger',
      },
    ],
    [router]
  )

  // Define bulk actions (appear when rows are selected)
  const bulkActions: BulkAction<Organisation>[] = useMemo(
    () => [
      {
        id: 'export',
        label: 'Exporter la sélection',
        icon: Download,
        onClick: async (rows) => {
          try {
            const orgIds = rows.map(row => row.id).join(',')
            const url = `${process.env.NEXT_PUBLIC_API_URL}/exports/organisations/csv?ids=${orgIds}`

            // Open download in new tab
            const link = document.createElement('a')
            link.href = url
            link.download = `organisations_export_${new Date().toISOString().split('T')[0]}.csv`
            link.click()

            alert(`Export de ${rows.length} organisation(s) lancé`)
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
          if (!confirm(`Supprimer ${rows.length} organisation(s) ?\n\nCette action est irréversible et supprimera aussi tous les contacts, mandats et interactions associés.`)) {
            return
          }

          try {
            const orgIds = rows.map(row => row.id)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organisations/bulk-delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              },
              body: JSON.stringify(orgIds),
            })

            if (!response.ok) {
              throw new Error('Erreur lors de la suppression')
            }

            const result = await response.json()

            if (result.failed > 0) {
              alert(`${result.deleted} organisation(s) supprimée(s)\n${result.failed} échec(s)`)
            } else {
              alert(`${result.deleted} organisation(s) supprimée(s) avec succès`)
            }

            // Trigger refresh by router reload
            router.refresh()
          } catch (error) {
            console.error('Bulk delete error:', error)
            alert('Erreur lors de la suppression en masse')
          }
        },
        variant: 'danger',
      },
    ],
    [router]
  )

  return (
    <PageContainer width="default">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-spacing-sm text-text-secondary dark:text-text-tertiary hover:text-primary dark:hover:text-primary transition-colors mb-spacing-sm"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Retour à l'annuaire</span>
      </Link>

      {/* Header */}
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-fluid-3xl font-bold text-text-primary dark:text-text-primary">Organisations</h1>
            <p className="text-fluid-sm text-text-tertiary dark:text-text-tertiary mt-spacing-xs">
              Gérez vos organisations et institutions.
            </p>
          </div>
          <div className="flex gap-spacing-sm">
            <Link href="/dashboard/organisations/import">
              <Button variant="secondary">📥 Importer</Button>
            </Link>
            <Link href="/dashboard/organisations/new">
              <Button variant="primary">
                <Building className="w-4 h-4" />
                Nouvelle organisation
              </Button>
            </Link>
          </div>
        </div>
      </PageHeader>

      {/* Error Alert */}
      {error && <Alert type="error" message={error.message || 'Erreur de chargement'} />}

      {/* DataTable Premium */}
      <PageSection>
        <Card>
          <DataTable<Organisation>
            data={data?.items || []}
            columns={columns}
            keyExtractor={(row) => row.id}
            searchable={{
              placeholder: 'Rechercher une organisation...',
              fields: ['name', 'email', 'category'],
            }}
            bulkActions={bulkActions}
            quickActions={quickActions}
            onRowClick={(row) => {
              router.push(`/dashboard/organisations/${row.id}`)
            }}
            isLoading={isLoading}
            isEmpty={!data?.items || data.items.length === 0}
            emptyState={{
              title: 'Aucune organisation',
              description: 'Commencez par ajouter votre première organisation.',
              action: {
                label: 'Nouvelle organisation',
                onClick: () => router.push(ROUTES.CRM.ORGANISATION_NEW),
              },
            }}
            pagination={{
              pageSize: 20,
              showPageSize: true,
              pageSizeOptions: [10, 20, 50, 100],
            }}
          />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
