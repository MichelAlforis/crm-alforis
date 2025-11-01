// app/dashboard/produits/new/page.tsx
// ============= CREATE PRODUIT PAGE =============

'use client'

import React, { lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card, PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'
import { useCreateProduit } from '@/hooks/useProduits'
import type { ProduitCreate } from '@/lib/types'

// Lazy load ProduitForm (only loads when page is accessed)
const ProduitForm = lazy(() => import('@/components/forms').then(m => ({ default: m.ProduitForm })))

export default function NewProduitPage() {
  const router = useRouter()
  const createMutation = useCreateProduit()

  const handleSubmit = async (data: ProduitCreate) => {
    const result = await createMutation.mutateAsync(data)
    // Rediriger vers la page de détail
    router.push(`/dashboard/produits/${result.id}`)
  }

  return (
    <PageContainer width="narrow">
      <PageHeader>
        <div>
          <PageTitle>Nouveau produit</PageTitle>
          <p className="text-text-secondary mt-spacing-sm">
            Créez un nouveau produit financier (OPCVM, ETF, SCPI, Assurance Vie, PER, etc.)
          </p>
        </div>
      </PageHeader>

      <PageSection>
        <Card>
          <Suspense fallback={<div className="p-spacing-lg text-center">Chargement du formulaire...</div>}>
            <ProduitForm
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending}
              error={createMutation.error?.message}
              submitLabel="Créer le produit"
            />
          </Suspense>
        </Card>
      </PageSection>
    </PageContainer>
  )
}
