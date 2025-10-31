'use client'

// app/dashboard/people/new/page.tsx
// ============= CREATE PERSON PAGE =============

import React, { lazy, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Button } from '@/components/shared'
import { usePeople } from '@/hooks/usePeople'
import type { PersonInput } from '@/lib/types'

// Lazy load PersonForm (only loads when page is accessed)
const PersonForm = lazy(() => import('@/components/forms').then(m => ({ default: m.PersonForm })))

export default function NewPersonPage() {
  const router = useRouter()
  const { createPerson, create } = usePeople()

  const handleSubmit = async (data: PersonInput) => {
    const person = await createPerson(data)
    router.push(`/dashboard/people/${person.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Nouvelle personne</h1>
          <p className="text-sm text-gray-500 mt-1">
            Renseignez les coordonnées personnelles de l’interlocuteur.
          </p>
        </div>
        <Link href="/dashboard/people">
          <Button variant="secondary">← Annuaire</Button>
        </Link>
      </div>

      <Card>
        <Suspense fallback={<div className="p-8 text-center">Chargement du formulaire...</div>}>
          <PersonForm
            onSubmit={handleSubmit}
            isLoading={create.isLoading}
            error={create.error}
            submitLabel="Créer la fiche"
          />
        </Suspense>
      </Card>
    </div>
  )
}
