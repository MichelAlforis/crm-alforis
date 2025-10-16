'use client'

// app/dashboard/people/page.tsx
// ============= PEOPLE DIRECTORY =============

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePeople } from '@/hooks/usePeople'
import { Card, Button, Table, Input, Alert } from '@/components/shared'
import { Person } from '@/lib/types'

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
]

export default function PeoplePage() {
  const { people, fetchPeople } = usePeople()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    fetchPeople(0, 50, debouncedSearch ? { q: debouncedSearch } : undefined)
  }, [debouncedSearch, fetchPeople])

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
        <Input
          placeholder="Rechercher par nom, email, rôle..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Card>

      {people.error && <Alert type="error" message={people.error} />}

      <Card>
        <Table
          columns={COLUMNS}
          data={people.data?.items || []}
          isLoading={people.isLoading}
          isEmpty={(people.data?.items?.length ?? 0) === 0}
        />
      </Card>
    </div>
  )
}
