
// app/dashboard/fournisseurs/new/page.tsx
// ============= CREATE FOURNISSEUR PAGE =============
// MIGRATED: Uses new Organisation API instead of legacy Fournisseur hooks

'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCreateOrganisation } from '@/hooks/useOrganisations'
import { Card, Alert } from '@/components/shared'
import { OrganisationForm } from '@/components/forms'
import type { OrganisationCreate } from '@/lib/types'

export default function NewFournisseurPage() {
  const router = useRouter()
  const createMutation = useCreateOrganisation()
  const [error, setError] = React.useState<string>()

  const handleSubmit = async (data: OrganisationCreate) => {
    try {
      setError(undefined)
      // Create as organisation type "fournisseur"
      const organisationData = {
        ...data,
        organisation_type: 'fournisseur',
      }
      const result = await createMutation.mutateAsync(organisationData)
      router.push(`/dashboard/fournisseurs/${result.id}`)
    } catch (err: any) {
      setError(err?.detail || 'Erreur lors de la création')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/fournisseurs" className="text-bleu hover:underline text-sm mb-2 block">
          ← Retour aux fournisseurs
        </Link>
        <h1 className="text-3xl font-bold text-ardoise">Nouveau fournisseur</h1>
      </div>

      {error && <Alert type="error" message={error} />}

      <Card padding="lg">
        <OrganisationForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          error={error}
          submitLabel="Créer le fournisseur"
        />
      </Card>
    </div>
  )
}