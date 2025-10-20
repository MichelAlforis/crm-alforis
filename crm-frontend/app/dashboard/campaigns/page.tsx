'use client'

import React from 'react'
import Link from 'next/link'
import { Plus, Eye } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Table } from '@/components/shared'
import { useEmailCampaigns } from '@/hooks/useEmailAutomation'
import type { EmailCampaign } from '@/lib/types'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-orange-100 text-orange-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function CampaignsPage() {
  const { campaigns, isLoading, error } = useEmailCampaigns()


  const columns = [
    {
      header: 'Campagne',
      accessor: 'name',
      render: (value: string, row: EmailCampaign) => (
        <div>
          <Link href={`/dashboard/campaigns/${row.id}`} className="font-medium text-bleu hover:underline">
            {value}
          </Link>
          {row.subject && (
            <p className="text-xs text-gray-500 mt-0.5">Objet: {row.subject}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[value as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700'}`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Programmée pour',
      accessor: 'scheduled_at',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString('fr-FR') : '-',
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/campaigns/${id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Campagnes Email</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos campagnes de marketing par email
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Impossible de charger les campagnes
        </div>
      )}

      <Card>
        <CardHeader
          title={`Campagnes (${campaigns.length})`}
          subtitle="Toutes vos campagnes email"
        />
        <CardBody>
          <Table
            data={campaigns}
            columns={columns}
            isLoading={isLoading}
            isEmpty={!isLoading && campaigns.length === 0}
            emptyMessage="Aucune campagne créée. Créez votre première campagne !"
          />
        </CardBody>
      </Card>
    </div>
  )
}
