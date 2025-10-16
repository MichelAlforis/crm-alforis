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
import { InvestorDetail, InteractionCreate, PersonOrganizationLink, PersonOrganizationLinkInput } from '@/lib/types'
import { usePeople } from '@/hooks/usePeople'

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
  const {
    linkPersonToOrganization,
    deletePersonOrganizationLink,
    updatePersonOrganizationLink,
  } = usePeople()
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkError, setLinkError] = useState<string>()
  const [isLinkSubmitting, setIsLinkSubmitting] = useState(false)
  const [linkPayload, setLinkPayload] = useState<PersonOrganizationLinkInput>({
    person_id: 0,
    organization_type: 'investor',
    organization_id: investorId,
    is_primary: false,
  })

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
  const peopleLinks = details.people || []

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

  const peopleColumns = [
    {
      header: 'Personne',
      accessor: 'personLabel',
      render: (_: string, row: PersonOrganizationLink & { personLabel: string }) => (
        <a href={`/dashboard/people/${row.person_id}`} className="text-bleu hover:underline">
          {row.personLabel}
        </a>
      ),
    },
    {
      header: 'Rôle',
      accessor: 'job_title',
    },
    {
      header: 'Email pro',
      accessor: 'work_email',
    },
    {
      header: 'Tel pro',
      accessor: 'work_phone',
    },
    {
      header: 'Principal',
      accessor: 'is_primary',
      render: (value: boolean) => (value ? 'Oui' : 'Non'),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: number, row: PersonOrganizationLink) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              updatePersonOrganizationLink(row.id, { is_primary: !row.is_primary }).then(() =>
                fetchInvestor(investorId),
              )
            }
          >
            {row.is_primary ? 'Retirer principal' : 'Marquer principal'}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="text-rouge"
            onClick={() => handleDeleteLink(row.id)}
          >
            Détacher
          </Button>
        </div>
      ),
    },
  ]

  const handleCreateLink = async () => {
    if (!linkPayload.person_id || linkPayload.person_id <= 0) {
      setLinkError('Sélectionnez une personne valide (ID numérique).')
      return
    }
    setIsLinkSubmitting(true)
    setLinkError(undefined)
    try {
      await linkPersonToOrganization(linkPayload)
      setIsLinkModalOpen(false)
      setLinkPayload({
        person_id: 0,
        organization_type: 'investor',
        organization_id: investorId,
        is_primary: false,
      })
      await fetchInvestor(investorId)
    } catch (err: any) {
      setLinkError(err?.detail || 'Erreur lors du rattachement')
    } finally {
      setIsLinkSubmitting(false)
    }
  }

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm('Retirer ce rattachement ?')) return
    await deletePersonOrganizationLink(linkId)
    await fetchInvestor(investorId)
  }

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
            <p className="text-sm text-gray-600">Téléphone accueil</p>
            <p className="font-medium text-sm">{data.main_phone || '-'}</p>
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

      {/* People Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ardoise">Personnes associées</h2>
        <Button variant="primary" onClick={() => setIsLinkModalOpen(true)}>
          + Associer une personne
        </Button>
      </div>

      <Card>
        <Table
          columns={peopleColumns}
          data={peopleLinks.map((link) => ({
            ...link,
            personLabel: link.person
              ? `${link.person.first_name} ${link.person.last_name}`
              : `Personne #${link.person_id}`,
          }))}
          isLoading={investor.isLoading}
          isEmpty={peopleLinks.length === 0}
        />
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

      {/* Link Person Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Associer une personne"
      >
        <div className="space-y-4">
          {linkError && <Alert type="error" message={linkError} />}

          <Input
            label="ID de la personne"
            type="number"
            value={linkPayload.person_id ? String(linkPayload.person_id) : ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({
                ...prev,
                person_id: Number(e.target.value),
              }))
            }
            placeholder="Ex: 42"
          />

          <Input
            label="Rôle / fonction"
            value={linkPayload.job_title || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, job_title: e.target.value || undefined }))
            }
            placeholder="Ex: Responsable investissement"
          />

          <Input
            label="Email professionnel"
            value={linkPayload.work_email || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, work_email: e.target.value || undefined }))
            }
            placeholder="prenom.nom@entreprise.com"
          />

          <Input
            label="Téléphone professionnel"
            value={linkPayload.work_phone || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, work_phone: e.target.value || undefined }))
            }
            placeholder="+33 ..."
          />

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={linkPayload.is_primary ?? false}
              onChange={(e) =>
                setLinkPayload((prev) => ({ ...prev, is_primary: e.target.checked }))
              }
            />
            Marquer comme contact principal
          </label>

          <Button
            variant="primary"
            className="w-full"
            isLoading={isLinkSubmitting}
            onClick={handleCreateLink}
          >
            Valider le rattachement
          </Button>
        </div>
      </Modal>
    </div>
  )
}
