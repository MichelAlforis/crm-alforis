// app/dashboard/investors/new/page.tsx
// ============= CREATE INVESTOR PAGE =============

'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useInvestors } from '@/hooks/useInvestors'
import { Card } from '@/components/shared'
import { InvestorForm } from '@/components/forms'
import { InvestorCreate } from '@/lib/types'

export default function NewInvestorPage() {
  const router = useRouter()
  const { create, createInvestor } = useInvestors()

  const handleSubmit = async (data: InvestorCreate) => {
    await createInvestor(data)
    router.push('/dashboard/investors')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/investors" className="text-bleu hover:underline text-sm mb-2 block">
          ← Retour aux investisseurs
        </Link>
        <h1 className="text-3xl font-bold text-ardoise">Nouvel investisseur</h1>
      </div>

      <Card padding="lg">
        <InvestorForm
          onSubmit={handleSubmit}
          isLoading={create.isLoading}
          error={create.error}
          submitLabel="Créer l'investisseur"
        />
      </Card>
    </div>
  )
}