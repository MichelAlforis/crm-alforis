'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { Plus, Edit, Trash2, List, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardBody, Button } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Alert } from '@/components/shared/Alert'
import { useMailingLists } from '@/hooks/useMailingLists'
import { useConfirm } from '@/hooks/useConfirm'
import { useClientSideTable } from '@/hooks/useClientSideTable'
import { usePagination } from '@/hooks/usePagination'

interface MailingList {
  id: number
  name: string
  description?: string
  target_type: string
  filters: any
  recipient_count: number
  is_active: boolean
  last_used_at?: string
  created_at: string
}

export default function MailingListsPage() {
  const router = useRouter()
  const {
    lists,
    isLoading: _isLoading,
    deleteList,
    isDeleting: _isDeleting,
  } = useMailingLists()

  const { confirm, ConfirmDialogComponent } = useConfirm()

  const table = useClientSideTable<MailingList>({
    data: lists,
    defaultSortKey: 'created_at',
    defaultSortDirection: 'desc',
  })

  // Pagination avec usePagination
  const pagination = usePagination({
    initialLimit: 20,
    initialPage: 1,
  })

  const handleDelete = (list: MailingList) => {
    confirm({
      title: 'Supprimer la liste ?',
      message: `Êtes-vous sûr de vouloir supprimer "${list.name}" ? Cette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        await deleteList(list.id)
      },
    })
  }

  // Pagination (applied to sorted data from hook)
  const paginatedLists = useMemo(() => {
    return table.filteredData.slice(pagination.skip, pagination.skip + pagination.limit)
  }, [table.filteredData, pagination.skip, pagination.limit])

  const totalPages = pagination.getTotalPages(table.filteredData.length)

  const columns: ColumnV2<MailingList>[] = [
    {
      header: 'Nom',
      accessor: 'name',
      sticky: 'left',
      priority: 'high',
      minWidth: '200px',
      render: (value: string, row: MailingList) => (
        <div>
          <p className="font-medium text-text-primary">{value}</p>
          {row.description && (
            <p className="text-xs text-text-tertiary mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: 'target_type',
      priority: 'high',
      minWidth: '120px',
      render: (value: string) => (
        <span className="text-sm capitalize">
          {value === 'contacts' ? 'Contacts' : 'Organisations'}
        </span>
      ),
    },
    {
      header: 'Destinataires',
      accessor: 'recipient_count',
      priority: 'high',
      minWidth: '140px',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-tertiary" />
          <span className="font-semibold text-primary">{value}</span>
        </div>
      ),
    },
    {
      header: 'Dernière utilisation',
      accessor: 'last_used_at',
      priority: 'medium',
      minWidth: '150px',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : 'Jamais utilisée',
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      priority: 'low',
      minWidth: '120px',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: number, row: MailingList) => {
        const actions: OverflowAction[] = [
          {
            label: 'Modifier',
            icon: Edit,
            onClick: () => router.push(`/dashboard/marketing/mailing-lists/${id}`),
            variant: 'default',
          },
          {
            label: 'Supprimer',
            icon: Trash2,
            onClick: () => handleDelete(row),
            variant: 'danger',
          },
        ]
        return <OverflowMenu actions={actions} />
      },
    },
  ]

  const totalRecipients = lists.reduce((acc, list) => acc + list.recipient_count, 0)

  return (
    <div className="space-y-spacing-lg p-spacing-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <List className="w-8 h-8 text-primary" />
            Listes de Diffusion
          </h1>
          <p className="text-text-secondary mt-1">
            Gérez vos listes de destinataires réutilisables
          </p>
        </div>
        <Link href="/dashboard/marketing/mailing-lists/new">
          <Button variant="primary" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle liste
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
        <Card>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Total listes</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{lists.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <List className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Total destinataires</p>
                <p className="text-3xl font-bold text-primary mt-1">{totalRecipients}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Moyenne par liste</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {lists.length > 0 ? Math.round(totalRecipients / lists.length) : 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Info */}
      <Alert
        type="info"
        message="Les listes de diffusion permettent de sauvegarder vos sélections de destinataires pour les réutiliser rapidement dans vos campagnes."
      />

      {/* Table */}
      <Card>
        <CardHeader
          title={`Listes (${lists.length})`}
          subtitle="Toutes vos listes de diffusion"
          icon={<List className="w-5 h-5 text-primary" />}
        />
        <CardBody>
          <TableV2<MailingList>
            columns={columns}
            data={paginatedLists}
            getRowKey={(row) => row.id.toString()}
            sortConfig={table.sortConfig}
            onSort={table.handleSort}
            size="md"
            variant="default"
            stickyHeader
            emptyMessage="Aucune liste créée. Créez votre première liste de diffusion !"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                Page {pagination.page} sur {totalPages} ({table.filteredData.length} listes au total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.prevPage}
                  disabled={!pagination.hasPrevPage}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNextPage(table.filteredData.length)}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </div>
  )
}
