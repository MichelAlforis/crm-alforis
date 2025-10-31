// app/dashboard/mandats/new/page.tsx
// ============= CREATE MANDAT PAGE =============

'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { Card } from '@/components/shared'
import { MandatForm } from '@/components/forms'
import { useCreateMandat } from '@/hooks/useMandats'
import type { MandatDistributionCreate } from '@/lib/types'

export default function NewMandatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const createMutation = useCreateMandat()

  // Récupérer l'organisation_id depuis les query params si fourni
  const organisationIdParam = searchParams?.get('organisation_id')
  const organisationId = organisationIdParam ? Number.parseInt(organisationIdParam, 10) : undefined

  const handleSubmit = async (data: MandatDistributionCreate) => {
    const result = await createMutation.mutateAsync(data)
    // Rediriger vers la page de détail du mandat
    router.push(`/dashboard/mandats/${result.id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-ardoise">Nouveau mandat de distribution</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Créez un nouveau mandat de distribution pour une organisation
        </p>
      </div>

      <Card>
        <MandatForm
          organisationId={organisationId}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
          submitLabel="Créer le mandat"
        />
      </Card>
    </div>
  )
}
