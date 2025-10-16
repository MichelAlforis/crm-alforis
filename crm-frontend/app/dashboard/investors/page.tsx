// app/dashboard/investors/page.tsx
// ============= INVESTORS LIST PAGE =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useInvestors } from '@/hooks/useInvestors'
import { Card, Button, Table, Input, Alert } from '@/components/shared'
import { Investor, PipelineStage } from '@/lib/types'

const PIPELINE_COLORS: Record<PipelineStage, string> = {
  prospect_froid: 'bg-blue-100 text-blue-800',
  prospect_tiede: 'bg-orange-100 text-orange-800',
  prospect_chaud: 'bg-red-100 text-red-800',
  en_negociation: 'bg-purple-100 text-purple-800',
  client: 'bg-vert text-white',
  inactif: 'bg-gray-100 text-gray-800',
}

export default function InvestorsPage() {
  const { investors, fetchInvestors } = useInvestors()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // Fetch investors
  useEffect(() => {
    fetchInvestors(0, 100, debouncedSearch)
  }, [debouncedSearch, fetchInvestors])

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Société',
      accessor: 'company',
    },
    {
      header: 'Pipeline',
      accessor: 'pipeline_stage',
      render: (value: PipelineStage) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${PIPELINE_COLORS[value]}`}>
          {value.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/investors/${id}`} className="text-bleu hover:underline text-sm">
            Voir
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ardoise">Investisseurs</h1>
        <Link href="/dashboard/investors/new">
          <Button variant="primary">+ Nouvel investisseur</Button>
        </Link>
      </div>

      <Card>
        <Input
          placeholder="Rechercher par nom, email, société..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Card>

      {investors.error && (
        <Alert type="error" message={investors.error} />
      )}

      <Card>
        <Table
          columns={columns}
          data={investors.data?.items || []}
          isLoading={investors.isLoading}
          isEmpty={investors.data?.items.length === 0}
        />
      </Card>

      {investors.data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Total: {investors.data.total} investisseurs</p>
          <p>
            Page {investors.data.skip / investors.data.limit + 1} sur{' '}
            {Math.ceil(investors.data.total / investors.data.limit)}
          </p>
        </div>
      )}
    </div>
  )
}

