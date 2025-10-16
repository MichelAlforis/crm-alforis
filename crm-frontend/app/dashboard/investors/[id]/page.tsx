// app/dashboard/investors/[id]/page.tsx
// ============= INVESTOR DETAIL PAGE - FIXED =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useInvestors } from '@/hooks/useInvestors'
import { useInteractions } from '@/hooks/useInteractions'
import { Card, Button, Table, Alert, Modal } from '@/components/shared'
import { InvestorForm, InteractionForm } from '@/components/forms'
import { InvestorDetail, InteractionCreate } from '@/lib/types'

export default function InvestorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const investorId = parseInt(params.id as string)
  
  // Destructurer correctement les hooks
  const { 
    single: investor, 
    fetchInvestor, 
    updateInvestor, 
    update: updateOp,
    delete: deleteOp, 
    deleteInvestor 
  } = useInvestors()
  
  const { 
    interactions, 
    create: interactionCreate,
    fetchInteractions, 
    createInteraction 
  } = useInteractions(investorId)
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)

  useEffect(() => {
    fetchInvestor(investorId)
    fetchInteractions()
  }, [investorId, fetchInvestor, fetchInteractions])

  const handleUpdate = async (data: any) => {
    await updateInvestor(investorId, data)
    setIsEditModalOpen(false)
  }

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet investisseur?')) {
      await deleteInvestor(investorId)
      router.push('/dashboard/investors')
    }
  }

  const handleAddInteraction = async (data: InteractionCreate) => {
    await createInteraction(data)
    setIsInteractionModalOpen(false)
  }

  if (investor.isLoading) return <div className="text-center p-6">Chargement...</div>
  if (!investor.data) return <div className="text-center p-6">Non trouvé</div>

  const details = investor.data as InvestorDetail
  const data = details.investor

  const interactionColumns = [
    { 
      header: 'Type', 
      accessor: 'type',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {value}
        </span>
      )
    },
    { 
      header: 'Date', 
      accessor: 'date', 
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR') 
    },
    { header: 'Sujet', accessor: 'subject' },
    { header: 'Durée (min)', accessor: 'duration_minutes' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/investors" className="text-bleu hover:underline text-sm mb-2 block">
            ← Retour
          </Link>
          <h1 className="text-3xl font-bold text-ardoise">{data.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Éditer
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteOp.isLoading}>
            Supprimer
          </Button>
        </div>
      </div>

      {/* Main info */}
      <Card padding="lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-sm">{data.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Téléphone</p>
            <p className="font-medium text-sm">{data.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Société</p>
            <p className="font-medium text-sm">{data.company || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pipeline</p>
            <p className="font-medium text-sm capitalize">{data.pipeline_stage?.replace(/_/g, ' ') || '-'}</p>
          </div>
        </div>

        {data.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">Notes</p>
            <p className="text-sm mt-1">{data.notes}</p>
          </div>
        )}
      </Card>

      {/* Interactions Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ardoise">Interactions</h2>
        <Button variant="primary" onClick={() => setIsInteractionModalOpen(true)}>
          + Ajouter interaction
        </Button>
      </div>

      {interactions.error && (
        <Alert type="error" message={interactions.error} />
      )}

      <Card>
        <Table
          columns={interactionColumns}
          data={interactions.data?.items || []}
          isLoading={interactions.isLoading}
          isEmpty={interactions.data?.items.length === 0}
        />
      </Card>

      {/* Edit Investor Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Éditer l'investisseur"
      >
        <InvestorForm
          initialData={data}
          onSubmit={handleUpdate}
          isLoading={updateOp.isLoading}
          error={updateOp.error}
          submitLabel="Mettre à jour"
        />
      </Modal>

      {/* Add Interaction Modal */}
      <Modal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        title="Ajouter une interaction"
      >
        <InteractionForm
          onSubmit={handleAddInteraction}
          isLoading={interactionCreate.isLoading}
          error={interactionCreate.error}
        />
      </Modal>
    </div>
  )
}
