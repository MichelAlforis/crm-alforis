// app/dashboard/produits/new/page.tsx
// ============= CREATE PRODUIT PAGE =============

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/shared'
import { ProduitForm } from '@/components/forms'
import { useCreateProduit } from '@/hooks/useProduits'
import type { ProduitCreate } from '@/lib/types'

export default function NewProduitPage() {
  const router = useRouter()
  const createMutation = useCreateProduit()

  const handleSubmit = async (data: ProduitCreate) => {
    const result = await createMutation.mutateAsync(data)
    // Rediriger vers la page de détail
    router.push(`/dashboard/produits/${result.id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-ardoise">Nouveau produit</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Créez un nouveau produit financier (OPCVM, ETF, SCPI, Assurance Vie, PER, etc.)
        </p>
      </div>

      <Card>
        <ProduitForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
          submitLabel="Créer le produit"
        />
      </Card>
    </div>
  )
}
