// app/dashboard/fournisseurs/page.tsx
// ============= FOURNISSEURS LIST PAGE (MIGRATED TO ORGANISATIONS) =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useOrganisations } from '@/hooks/useOrganisations'
import { Card, Button, Table, Input, Alert } from '@/components/shared'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

export default function FournisseursPage() {
  const { organisations, fetchOrganisations } = useOrganisations()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    if (debouncedSearch.trim()) {
      // For search, would need to implement search functionality
      fetchOrganisations({ skip: 0, limit: 100 })
    } else {
      fetchOrganisations({ skip: 0, limit: 100 })
    }
  }, [debouncedSearch, fetchOrganisations])

  const getCountryLabel = (code?: string | null) => {
    if (!code) return '-'
    return COUNTRY_OPTIONS.find((option) => option.value === code)?.label ?? code
  }

  const getLanguageLabel = (code?: string | null) => {
    if (!code) return '-'
    return LANGUAGE_OPTIONS.find((option) => option.value === code)?.label ?? code
  }

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
      header: 'Activité',
      accessor: 'activity',
    },
    {
      header: 'Téléphone accueil',
      accessor: 'main_phone',
    },
    {
      header: 'Pays',
      accessor: 'country_code',
      render: (value: string | null) => getCountryLabel(value),
    },
    {
      header: 'Langue',
      accessor: 'language',
      render: (value: string | null) => getLanguageLabel(value),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <Link href={`/dashboard/fournisseurs/${id}`} className="text-bleu hover:underline text-sm">
          Voir
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ardoise">Fournisseurs (FSS)</h1>
        <Link href="/dashboard/fournisseurs/new">
          <Button variant="primary">+ Nouveau fournisseur</Button>
        </Link>
      </div>

      <Card>
        <Input
          placeholder="Rechercher par nom, email, secteur..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Card>

      {organisations.error && (
        <Alert type="error" message={organisations.error} />
      )}

      <Card>
        <Table
          columns={columns}
          data={organisations.data?.items || []}
          isLoading={organisations.isLoading}
          isEmpty={organisations.data?.items.length === 0}
        />
      </Card>

      {organisations.data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Total: {organisations.data.total} organisations</p>
        </div>
      )}
    </div>
  )
}
