
// app/dashboard/fournisseurs/new/page.tsx
// ============= CREATE FOURNISSEUR PAGE =============

'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFournisseurs } from '@/hooks/useFournisseurs'
import { Card } from '@/components/shared'
import { FournisseurForm } from '@/components/forms'
import { FournisseurCreate } from '@/lib/types'

export default function NewFournisseurPage() {
  const router = useRouter()
  const { create, createFournisseur } = useFournisseurs()

  const handleSubmit = async (data: FournisseurCreate) => {
    await createFournisseur(data)
    router.push('/dashboard/fournisseurs')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/fournisseurs" className="text-bleu hover:underline text-sm mb-2 block">
          ← Retour aux fournisseurs
        </Link>
        <h1 className="text-3xl font-bold text-ardoise">Nouveau fournisseur</h1>
      </div>

      <Card padding="lg">
        <FournisseurForm
          onSubmit={handleSubmit}
          isLoading={create.isLoading}
          error={create.error}
          submitLabel="Créer le fournisseur"
        />
      </Card>
    </div>
  )
}