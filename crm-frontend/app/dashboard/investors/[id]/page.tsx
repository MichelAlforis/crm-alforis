// app/dashboard/investors/[id]/page.tsx
// ============= INVESTOR DETAIL PAGE - MIGRATED TO ORGANISATION API =============

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useOrganisationActivity, flattenActivities } from '@/hooks/useOrganisationActivity'
import { Card, Button, Table, Alert, Modal, Input } from '@/components/shared'
import { OrganisationForm } from '@/components/forms'
import { PersonOrganizationLink, PersonOrganizationLinkInput } from '@/lib/types'
import { usePeople } from '@/hooks/usePeople'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

export default function InvestorDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const investorId = useMemo(() => {
    const rawId = params?.id
    const parsed = rawId ? Number.parseInt(rawId, 10) : NaN
    return Number.isNaN(parsed) ? null : parsed
  }, [params])
  
  const [investor, setInvestor] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updateError, setUpdateError] = useState<string>()

  const activityQuery = investorId ? useOrganisationActivity(investorId) : null
  const activities = useMemo(() => 
    flattenActivities(activityQuery?.data?.pages), 
    [activityQuery?.data?.pages]
  )
  const activitiesLoading = activityQuery?.isLoading ?? false
  const {
    linkPersonToOrganization,
    deletePersonOrganizationLink,
    updatePersonOrganizationLink,
  } = usePeople()
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkError, setLinkError] = useState<string>()
  const [isLinkSubmitting, setIsLinkSubmitting] = useState(false)
  const [linkPayload, setLinkPayload] = useState<PersonOrganizationLinkInput>({
    person_id: 0,
    organization_type: 'investor',
    organization_id: investorId ?? 0,
    is_primary: false,
  })

  const fetchInvestor = async (id: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/organisations/${id}`)
      if (!response.ok) throw new Error('Failed to fetch investor')
      const data = await response.json()
      setInvestor(data)
    } catch (err) {
      console.error('Error fetching investor:', err)
      setInvestor(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setLinkPayload((prev) => ({
      ...prev,
      organization_id: investorId ?? 0,
    }))
  }, [investorId])

  useEffect(() => {
    if (investorId === null) {
      router.replace('/dashboard/investors')
      return
    }
    
    fetchInvestor(investorId)
  }, [investorId])

  const handleUpdate = async (data: any) => {
    if (investorId === null) return
    setIsUpdating(true)
    setUpdateError(undefined)
    try {
      const response = await fetch(`/api/organisations/${investorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update investor')
      const updated = await response.json()
      setInvestor(updated)
      setIsEditModalOpen(false)
    } catch (err: any) {
      setUpdateError(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (investorId === null) return
    if (confirm('Êtes-vous sûr de vouloir supprimer cet investisseur?')) {
      setIsDeleting(true)
      try {
        const response = await fetch(`/api/organisations/${investorId}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete investor')
        router.push('/dashboard/investors')
      } catch (err) {
        console.error('Error deleting investor:', err)
        setIsDeleting(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    )
  }
  if (!investor) return <div className="text-center p-6">Non trouvé</div>

  const data = investor
  const peopleLinks = investor.people || []
  const countryValue = data.country_code || ''
  const countryLabel = countryValue
    ? COUNTRY_OPTIONS.find((option) => option.value === countryValue)?.label || countryValue
    : '-'
  const languageValue = data.language || ''
  const languageLabel = languageValue
    ? LANGUAGE_OPTIONS.find((option) => option.value === languageValue)?.label || languageValue
    : '-'

  const activityColumns = [
    { 
      header: 'Type', 
      accessor: 'event_type',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {value}
        </span>
      )
    },
    { 
      header: 'Date', 
      accessor: 'created_at', 
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR') 
    },
    { header: 'Description', accessor: 'description' },
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
              updatePersonOrganizationLink(row.id, { is_primary: !row.is_primary }).then(() => {
                if (investorId !== null) {
                  fetchInvestor(investorId)
                }
              })
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
        organization_id: investorId ?? 0,
        is_primary: false,
      })
      if (investorId !== null) {
        await fetchInvestor(investorId)
      }
    } catch (err: any) {
      setLinkError(err?.detail || 'Erreur lors du rattachement')
    } finally {
      setIsLinkSubmitting(false)
    }
  }

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm('Retirer ce rattachement ?')) return
    await deletePersonOrganizationLink(linkId)
    if (investorId !== null) {
      await fetchInvestor(investorId)
    }
  }

  if (investorId === null) {
    return <div className="text-center p-6">Investisseur introuvable</div>
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
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            Supprimer
          </Button>
        </div>
      </div>

      {/* Main info */}
      <Card padding="lg">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
          <div>
            <p className="text-sm text-gray-600">Pays</p>
            <p className="font-medium text-sm">{countryLabel}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Langue</p>
            <p className="font-medium text-sm">{languageLabel}</p>
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
          isLoading={isLoading}
          isEmpty={peopleLinks.length === 0}
        />
      </Card>

      {/* Activity History Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ardoise">Historique d'activité</h2>
      </div>

      <Card>
        <Table
          columns={activityColumns}
          data={activities}
          isLoading={activitiesLoading}
          isEmpty={activities.length === 0}
        />
      </Card>

      {/* Edit Investor Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Éditer l'investisseur"
      >
        <OrganisationForm
          initialData={data}
          onSubmit={handleUpdate}
          isLoading={isUpdating}
          error={updateError}
          submitLabel="Mettre à jour"
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
