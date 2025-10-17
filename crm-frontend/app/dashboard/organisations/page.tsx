// app/dashboard/organisations/page.tsx
// ============= ORGANISATIONS LIST PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useOrganisations } from '@/hooks/useOrganisations'
import { Card, Button, Table, Input, Alert, Select } from '@/components/shared'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { OrganisationCategory } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  DISTRIBUTEUR: 'Distributeur',
  EMETTEUR: 'Émetteur',
  FOURNISSEUR_SERVICE: 'Fournisseur de service',
  PARTENAIRE: 'Partenaire',
  AUTRE: 'Autre',
  Institution: 'Institution',
  Wholesale: 'Wholesale',
  SDG: 'SDG',
  CGPI: 'CGPI',
  Autres: 'Autres',
}

export default function OrganisationsPage() {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('')

  const { data, isLoading, error } = useOrganisations({
    limit: 100,
    category: categoryFilter || undefined,
    is_active: activeFilter ? activeFilter === 'true' : undefined,
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

  // Filtrer côté client par nom/email
  const filteredData = data?.items.filter((org) => {
    const search = searchText.toLowerCase()
    return (
      org.name.toLowerCase().includes(search) ||
      org.email?.toLowerCase().includes(search) ||
      ''
    )
  })

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
    },
    {
      header: 'Catégorie',
      accessor: 'category',
      render: (value: OrganisationCategory) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
          {CATEGORY_LABELS[value]}
        </span>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (value: string | null) => value || '-',
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
      header: 'Statut',
      accessor: 'is_active',
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
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
      render: (id: number) => (
        <Link
          href={`/dashboard/organisations/${id}`}
          className="text-bleu hover:underline text-sm"
        >
          Voir
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ardoise">Organisations</h1>
        <Link href="/dashboard/organisations/new">
          <Button variant="primary">+ Nouvelle organisation</Button>
        </Link>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Rechercher par nom, email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Toutes les catégories</option>
            <option value="DISTRIBUTEUR">Distributeur</option>
            <option value="EMETTEUR">Émetteur</option>
            <option value="FOURNISSEUR_SERVICE">Fournisseur de service</option>
            <option value="PARTENAIRE">Partenaire</option>
            <option value="AUTRE">Autre</option>
          </Select>

          <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="true">Actives</option>
            <option value="false">Inactives</option>
          </Select>
        </div>
      </Card>

      {error && <Alert type="error" message={error.message || 'Erreur de chargement'} />}

      <Card>
        <Table
          columns={columns}
          data={filteredData || []}
          isLoading={isLoading}
          isEmpty={!filteredData || filteredData.length === 0}
        />
      </Card>

      {data && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Total: {filteredData?.length || 0} / {data.total} organisations
          </p>
        </div>
      )}
    </div>
  )
}
