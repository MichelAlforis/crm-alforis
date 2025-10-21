// app/dashboard/interactions/[id]/page.tsx
// ============= INTERACTION DETAIL PAGE =============

'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Alert } from '@/components/shared'
import { ArrowLeft } from 'lucide-react'

export default function InteractionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const activityId = params.id ? parseInt(params.id as string) : null

  // TODO: Implémenter la récupération des détails de l'activité
  // const { data: activity, isLoading, error } = useActivity(activityId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold text-ardoise">Détail de l'interaction</h1>
      </div>

      <Alert
        type="info"
        message="Cette page est en cours de développement. Les détails de l'interaction seront bientôt disponibles."
      />

      <Card>
        <div className="p-6">
          <p className="text-gray-600">
            ID de l'activité : <strong>{activityId}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Utilisez le bouton "Retour" pour revenir à la liste des interactions.
          </p>
        </div>
      </Card>
    </div>
  )
}
