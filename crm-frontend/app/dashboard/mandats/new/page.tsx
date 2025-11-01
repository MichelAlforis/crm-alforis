// app/dashboard/mandats/new/page.tsx
// ============= CREATE MANDAT PAGE =============

'use client'

import React, { lazy, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/shared'
import { PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'
import { useCreateMandat } from '@/hooks/useMandats'
import type { MandatDistributionCreate } from '@/lib/types'

// Lazy load MandatForm (only loads when page is accessed)
const MandatForm = lazy(() => import('@/components/forms').then(m => ({ default: m.MandatForm })))

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
    <PageContainer width="narrow">
      <PageHeader>
        <PageTitle>Nouveau mandat de distribution</PageTitle>
        <p className="text-text-secondary mt-2">
          Créez un nouveau mandat de distribution pour une organisation
        </p>
      </PageHeader>

      <PageSection>
        <Card>
          <Suspense fallback={<div className="p-spacing-lg text-center">Chargement du formulaire...</div>}>
            <MandatForm
              organisationId={organisationId}
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending}
              error={createMutation.error?.message}
              submitLabel="Créer le mandat"
            />
          </Suspense>
        </Card>
      </PageSection>
    </PageContainer>
  )
}
