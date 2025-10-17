'use client'

// app/dashboard/people/page.tsx
// ============= PEOPLE DIRECTORY =============

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePeople } from '@/hooks/usePeople'
import { Card, Button, Table, Input, Alert, AdvancedFilters } from '@/components/shared'
import { Person } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

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

const COLUMNS = [
  {
    header: 'Nom',
    accessor: 'fullName',
    render: (_: string, row: Person) => (
      <Link
        href={`/dashboard/people/${row.id}`}
        className="text-bleu hover:underline text-sm font-medium"
      >
        {`${row.first_name} ${row.last_name}`}
      </Link>
    ),
  },
  {
    header: 'Rôle',
    accessor: 'role',
  },
  {
    header: 'Email',
    accessor: 'personal_email',
  },
  {
    header: 'Mobile',
    accessor: 'personal_phone',
  },
  {
    header: 'Pays',
    accessor: 'country_code',
    render: (value: string | null | undefined) =>
      value ? COUNTRY_LABELS[value] || value : '-',
  },
  {
    header: 'Langue',
    accessor: 'language',
    render: (value: string | null | undefined) =>
      value ? LANGUAGE_LABELS[value] || value : '-',
  },
]

export default function PeoplePage() {
  const { people, fetchPeople } = usePeople()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtersState, setFiltersState] = useState({
    role: '',
    country: '',
    language: '',
    createdFrom: '',
    createdTo: '',
  })

  const handleFilterChange = (key: string, value: unknown) => {
    if (Array.isArray(value)) return
    setFiltersState((prev) => ({
      ...prev,
      [key]: value as string,
    }))
  }

  const resetFilters = () =>
    setFiltersState({
      role: '',
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    fetchPeople(0, 50, debouncedSearch ? { q: debouncedSearch } : undefined)
  }, [debouncedSearch, fetchPeople])

  const advancedFilterDefinitions = [
    {
      key: 'role',
      label: 'Rôle contient',
      type: 'search' as const,
      placeholder: 'Directeur, Analyste...',
    },
    {
      key: 'country',
      label: 'Pays',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les pays' },
        ...COUNTRY_OPTIONS.filter((option) => option.value).map((option) => ({
          value: option.value,
          label: option.label,
        })),
      ],
    },
    {
      key: 'language',
      label: 'Langue',
      type: 'select' as const,
      options: [
        { value: '', label: 'Toutes les langues' },
        ...LANGUAGE_OPTIONS.filter((option) => option.code).map((option) => ({
          value: option.code,
          label: `${option.flag} ${option.name}`,
        })),
      ],
    },
    {
      key: 'createdFrom',
      label: 'Créés après',
      type: 'date' as const,
    },
    {
      key: 'createdTo',
      label: 'Créés avant',
      type: 'date' as const,
    },
  ]

  const filteredPeople = (people.data?.items ?? []).filter((person) => {
    const matchesSearch =
      `${person.first_name} ${person.last_name}`.toLowerCase().includes(
        searchText.toLowerCase()
      ) ||
      person.personal_email?.toLowerCase().includes(searchText.toLowerCase()) ||
      person.role?.toLowerCase().includes(searchText.toLowerCase()) ||
      ''

    const matchesRole = filtersState.role
      ? person.role?.toLowerCase().includes(filtersState.role.toLowerCase())
      : true

    const matchesCountry = filtersState.country
      ? person.country_code === filtersState.country
      : true

    const matchesLanguage = filtersState.language
      ? (person.language || '').toUpperCase() === filtersState.language
      : true

    const createdAt = person.created_at ? new Date(person.created_at) : null
    const matchesCreatedFrom = filtersState.createdFrom
      ? createdAt && createdAt >= new Date(filtersState.createdFrom)
      : true

    const matchesCreatedTo = filtersState.createdTo
      ? createdAt && createdAt <= new Date(filtersState.createdTo)
      : true

    return (
      matchesSearch &&
      matchesRole &&
      matchesCountry &&
      matchesLanguage &&
      matchesCreatedFrom &&
      matchesCreatedTo
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Personnes physiques</h1>
          <p className="text-sm text-gray-500 mt-1">
            Annuaire centralisé des interlocuteurs et décisionnaires.
          </p>
        </div>
        <Link href="/dashboard/people/new">
          <Button variant="primary">+ Nouvelle personne</Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            placeholder="Rechercher par nom, email, rôle..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <AdvancedFilters
            filters={advancedFilterDefinitions}
            values={filtersState}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />
        </div>
      </Card>

      {people.error && <Alert type="error" message={people.error} />}

      <Card>
        <Table
          columns={COLUMNS}
          data={filteredPeople}
          isLoading={people.isLoading}
          isEmpty={filteredPeople.length === 0}
        />
      </Card>
    </div>
  )
}
