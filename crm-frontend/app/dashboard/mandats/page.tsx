// app/dashboard/mandats/page.tsx
// ============= MANDATS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useMandats } from '@/hooks/useMandats'
import { Card, Button, Table, Alert, Select } from '@/components/shared'
import { MandatStatus } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_NEGOCIATION: 'En négociation',
  SIGNE: 'Signé',
  ACTIF: 'Actif',
  EXPIRE: 'Expiré',
  RESILIE: 'Résilié',
  proposé: 'Proposé',
  signé: 'Signé',
  actif: 'Actif',
  terminé: 'Terminé',
}

export default function MandatsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useMandats({
    limit: 100,
    status: statusFilter || undefined,
  })

  const columns = [
    {
      header: 'N° Mandat',
      accessor: 'numero_mandat',
      render: (value: string | null) => value || '-',
    },
    {
      header: 'Organisation',
      accessor: 'organisation',
      render: (org: any) => (
        <Link
          href={`/dashboard/organisations/${org.id}`}
          className="text-bleu hover:underline"
        >
          {org.name}
        </Link>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value: MandatStatus) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'ACTIF' || value === 'SIGNE'
              ? 'bg-green-100 text-green-800'
              : value === 'EXPIRE' || value === 'RESILIE'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {STATUS_LABELS[value]}
        </span>
      ),
    },
    {
      header: 'Date début',
      accessor: 'date_debut',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Date fin',
      accessor: 'date_fin',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : 'Indéterminée',
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <Link href={`/dashboard/mandats/${id}`} className="text-bleu hover:underline text-sm">
          Voir
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Mandats de distribution</h1>
          <p className="text-gray-600 mt-1">
            Gérez les mandats de distribution de vos organisations
          </p>
        </div>
        <Link href="/dashboard/mandats/new">
          <Button variant="primary">+ Nouveau mandat</Button>
        </Link>
      </div>

      <Card>
        <div className="flex gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-64"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="EN_NEGOCIATION">En négociation</option>
            <option value="SIGNE">Signé</option>
            <option value="ACTIF">Actif</option>
            <option value="EXPIRE">Expiré</option>
            <option value="RESILIE">Résilié</option>
          </Select>
        </div>
      </Card>

      {error && <Alert type="error" message={error.message || 'Erreur de chargement'} />}

      <Card>
        <Table
          columns={columns}
          data={data?.items || []}
          isLoading={isLoading}
          isEmpty={!data || data.items.length === 0}
        />
      </Card>

      {data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Total: {data.total} mandats</p>
        </div>
      )}
    </div>
  )
}
