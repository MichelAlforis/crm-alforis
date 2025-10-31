// app/dashboard/organisations/new/page.tsx
// ============= CREATE ORGANISATION PAGE =============

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { Card } from '@/components/shared'
import { OrganisationForm } from '@/components/forms'
import { useCreateOrganisation } from '@/hooks/useOrganisations'
import type { OrganisationCreate } from '@/lib/types'

export default function NewOrganisationPage() {
  const router = useRouter()
  const createMutation = useCreateOrganisation()

  const handleSubmit = async (data: OrganisationCreate) => {
    const result = await createMutation.mutateAsync(data)
    // Rediriger vers la page de détail
    router.push(`/dashboard/organisations/${result.id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-ardoise">Nouvelle organisation</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Créez une nouvelle organisation (distributeur, émetteur, fournisseur de service, etc.)
        </p>
      </div>

      <Card>
        <OrganisationForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
          submitLabel="Créer l'organisation"
        />
      </Card>
    </div>
  )
}
