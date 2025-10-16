// app/dashboard/interactions/page.tsx
// ============= INTERACTIONS PAGE =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useInvestors } from '@/hooks/useInvestors'
import { useInteractions } from '@/hooks/useInteractions'
import { Card, Button, Table, Select, Modal, Alert } from '@/components/shared'
import { InteractionForm } from '@/components/forms'
import { Interaction, InteractionCreate } from '@/lib/types'

export default function InteractionsPage() {
  const { investors, fetchInvestors } = useInvestors()
  const [selectedInvestorId, setSelectedInvestorId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const interactions = selectedInvestorId 
    ? useInteractions(selectedInvestorId)
    : null

  useEffect(() => {
    fetchInvestors(0, 1000)
  }, [])

  useEffect(() => {
    if (selectedInvestorId && interactions) {
      interactions.fetchInteractions()
    }
  }, [selectedInvestorId])

  const handleAddInteraction = async (data: InteractionCreate) => {
    if (interactions) {
      await interactions.createInteraction(data)
      setIsModalOpen(false)
    }
  }

  const handleDelete = async (interactionId: number) => {
    if (interactions && confirm('Supprimer cette interaction?')) {
      await interactions.deleteInteraction(interactionId)
    }
  }

  const columns = [
    {
      header: 'Type',
      accessor: 'type',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {value}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Sujet',
      accessor: 'subject',
    },
    {
      header: 'Durée (min)',
      accessor: 'duration_minutes',
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <button
          onClick={() => handleDelete(id)}
          className="text-rouge hover:underline text-sm"
        >
          Supprimer
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-ardoise">Interactions</h1>

      {/* Sélection d'investisseur */}
      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un investisseur
          </label>
          <select
            value={selectedInvestorId || ''}
            onChange={(e) => setSelectedInvestorId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">-- Choisir un investisseur --</option>
            {investors.data?.items?.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {selectedInvestorId && interactions && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Interactions</h2>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              + Ajouter
            </Button>
          </div>

          {interactions.interactions.error && (
            <Alert type="error" message={interactions.interactions.error} />
          )}

          <Card>
            <Table
              columns={columns}
              data={interactions.interactions.data?.items || []}
              isLoading={interactions.interactions.isLoading}
              isEmpty={interactions.interactions.data?.items.length === 0}
            />
          </Card>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Ajouter une interaction"
          >
            <InteractionForm
              onSubmit={handleAddInteraction}
              isLoading={interactions.create.isLoading}
              error={interactions.create.error}
            />
          </Modal>
        </>
      )}
    </div>
  )
}