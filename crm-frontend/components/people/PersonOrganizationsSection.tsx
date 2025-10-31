'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Card } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Trash2 } from 'lucide-react'
import type { PersonOrganizationLink } from '@/lib/types'

interface OrganizationLinkRow extends PersonOrganizationLink {
  organizationLabel: string
  personLabel: string
}

interface PersonOrganizationsSectionProps {
  organizationRows: OrganizationLinkRow[]
  isLoading: boolean
  onUpdateLink: (linkId: number, data: { is_primary: boolean }) => Promise<void>
  onDeleteLink: (linkId: number) => void
  onAddClick: () => void
}

export function PersonOrganizationsSection({
  organizationRows,
  isLoading,
  onUpdateLink,
  onDeleteLink,
  onAddClick,
}: PersonOrganizationsSectionProps) {
  const [, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey((prev) => prev + 1)

  const linkColumns: ColumnV2<OrganizationLinkRow>[] = [
    {
      key: 'organization_name',
      label: 'Organisation',
      sortable: true,
      render: (_value: unknown, row: OrganizationLinkRow) => (
        <Link
          href={`/dashboard/organisations/${row.organization_id}`}
          className="text-bleu hover:underline font-medium"
        >
          {row.organizationLabel}
        </Link>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      sortable: true,
      render: (_value: unknown, row: OrganizationLinkRow) => (
        <span className="text-sm">{row.role || '-'}</span>
      ),
    },
    {
      key: 'is_primary',
      label: 'Principal',
      sortable: true,
      render: (_value: unknown, row: OrganizationLinkRow) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            row.is_primary
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.is_primary ? 'Oui' : 'Non'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value: unknown, row: OrganizationLinkRow) => {
        const actions: OverflowAction[] = [
          {
            label: row.is_primary ? 'Retirer principal' : 'Définir principal',
            icon: Trash2,
            onClick: () => onUpdateLink(row.id, { is_primary: !row.is_primary }).then(refresh),
            variant: 'default',
          },
          {
            label: 'Supprimer',
            icon: Trash2,
            onClick: () => onDeleteLink(row.id),
            variant: 'danger',
          },
        ]
        return <OverflowMenu actions={actions} />
      },
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ardoise">Rattachements</h2>
        <Button variant="primary" onClick={onAddClick}>
          + Associer une organisation
        </Button>
      </div>

      <Card>
        <TableV2<OrganizationLinkRow>
          columns={linkColumns}
          data={organizationRows}
          isLoading={isLoading}
          isEmpty={organizationRows.length === 0}
          emptyMessage="Aucun rattachement à une organisation"
          rowKey={(row: OrganizationLinkRow) => row.id.toString()}
          size="md"
          variant="default"
          stickyHeader
        />
      </Card>
    </>
  )
}
