
// app/dashboard/fournisseurs/[id]/page.tsx
// ============= FOURNISSEUR DETAIL PAGE =============
// MIGRATED: Uses new Organisation API instead of legacy Fournisseur hooks

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useOrganisationActivity, flattenActivities } from '@/hooks/useOrganisationActivity'
import { Card, Button, Table, Alert, Modal, Input } from '@/components/shared'
import { OrganisationForm } from '@/components/forms'
import { usePeople } from '@/hooks/usePeople'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

export default function FournisseurDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const fournisseurId = useMemo(() => {
    const rawId = params?.id
    const parsed = rawId ? Number.parseInt(rawId, 10) : NaN
    return Number.isNaN(parsed) ? null : parsed
  }, [params])

  const activityQuery = fournisseurId ? useOrganisationActivity(fournisseurId) : null
  const activities = useMemo(() => 
    flattenActivities(activityQuery?.data?.pages), 
    [activityQuery?.data?.pages]
  )
  const activityLoading = activityQuery?.isLoading ?? false
  const activityError = activityQuery?.error ? String(activityQuery.error) : undefined
  const {
    linkPersonToOrganization,
    deletePersonOrganizationLink,
    updatePersonOrganizationLink,
  } = usePeople()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkError, setLinkError] = useState<string>()
  const [isLinkSubmitting, setIsLinkSubmitting] = useState(false)
  const [linkPayload, setLinkPayload] = useState<any>({
    person_id: 0,
    organization_type: 'fournisseur',
    organization_id: fournisseurId ?? 0,
    is_primary: false,
  })
  const [currentOrg, setCurrentOrg] = useState<any>(null)

  useEffect(() => {
    if (fournisseurId === null) {
      router.replace('/dashboard/fournisseurs')
      return
    }
    // Fetch specific organisation by ID
    fetch(`/api/organisations/${fournisseurId}`)
      .then(r => r.json())
      .then(data => setCurrentOrg(data))
      .catch(err => console.error('Error fetching org:', err))
  }, [fournisseurId, router])

  useEffect(() => {
    setLinkPayload((prev: any) => ({
      ...prev,
      organization_id: fournisseurId ?? 0,
    }))
  }, [fournisseurId])

  const handleUpdate = async (data: any) => {
    if (fournisseurId === null) return
    try {
      const response = await fetch(`/api/organisations/${fournisseurId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        setCurrentOrg(await response.json())
        setIsEditModalOpen(false)
      }
    } catch (err) {
      console.error('Error updating org:', err)
    }
  }

  const handleDelete = async () => {
    if (fournisseurId === null) return
    if (confirm('Êtes-vous sûr de vouloir supprimer cette organisation?')) {
      try {
        const response = await fetch(`/api/organisations/${fournisseurId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          router.push('/dashboard/fournisseurs')
        }
      } catch (err) {
        console.error('Error deleting org:', err)
      }
    }
  }

  if (fournisseurId === null) return <div className="text-center p-6">Organisation introuvable</div>
  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    )
  }

  const data = currentOrg
  const peopleLinks = currentOrg.people || []
  const countryValue = data.country_code || ''
  const countryLabel = countryValue
    ? COUNTRY_OPTIONS.find((option) => option.value === countryValue)?.label || countryValue
    : '-'
  const languageValue = data.language || ''
  const languageLabel = languageValue
    ? LANGUAGE_OPTIONS.find((option) => option.value === languageValue)?.label || languageValue
    : '-'

  const primaryLink = peopleLinks.find((p: any) => p.is_primary) ?? peopleLinks[0]
  const primaryContactName = primaryLink?.person
    ? `${primaryLink.person.first_name} ${primaryLink.person.last_name}`
    : '-'

  const activityColumns = [
    { header: 'Type', accessor: 'event_type' },
    { header: 'Date', accessor: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('fr-FR') },
    { header: 'Description', accessor: 'description' },
  ]

  const peopleColumns = [
    {
      header: 'Personne',
      accessor: 'personLabel',
      render: (_: string, row: any) => (
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
      render: (_: number, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              updatePersonOrganizationLink(row.id, { is_primary: !row.is_primary }).then(() => {
                // Refresh organisation
                fetch(`/api/organisations/${fournisseurId}`)
                  .then(r => r.json())
                  .then(data => setCurrentOrg(data))
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
    if (fournisseurId === null) {
      setLinkError('Organisation invalide')
      return
    }
    if (!linkPayload.person_id || linkPayload.person_id <= 0) {
      setLinkError('ID personne invalide')
      return
    }
    setIsLinkSubmitting(true)
    setLinkError(undefined)
    try {
      await linkPersonToOrganization(linkPayload)
      setIsLinkModalOpen(false)
      setLinkPayload({
        person_id: 0,
        organization_type: 'fournisseur',
        organization_id: fournisseurId,
        is_primary: false,
      })
      // Refresh organisation
      const response = await fetch(`/api/organisations/${fournisseurId}`)
      setCurrentOrg(await response.json())
    } catch (err: any) {
      setLinkError(err?.detail || 'Erreur lors du rattachement')
    } finally {
      setIsLinkSubmitting(false)
    }
  }

  const handleDeleteLink = async (linkId: number) => {
    if (fournisseurId === null) return
    if (!confirm('Retirer ce rattachement ?')) return
    await deletePersonOrganizationLink(linkId)
    // Refresh organisation
    const response = await fetch(`/api/organisations/${fournisseurId}`)
    setCurrentOrg(await response.json())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/fournisseurs" className="text-bleu hover:underline text-sm mb-2 block">
            ← Retour
          </Link>
          <h1 className="text-3xl font-bold text-ardoise">{data.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Éditer
          </Button>
          <Button variant="danger" onClick={handleDelete}>
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
            <p className="text-sm text-gray-600">Secteur</p>
            <p className="font-medium text-sm">{data.activity || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Personne référente</p>
            <p className="font-medium text-sm">
              {primaryContactName}
            </p>
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
      </Card>

      {/* People Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Personnes associées</h2>
        <Button variant="primary" onClick={() => setIsLinkModalOpen(true)}>
          + Associer une personne
        </Button>
      </div>

      <Card>
        <Table
          columns={peopleColumns}
          data={peopleLinks.map((link: any) => ({
            ...link,
            personLabel: link.person
              ? `${link.person.first_name} ${link.person.last_name}`
              : `Personne #${link.person_id}`,
          }))}
          isLoading={false}
          isEmpty={peopleLinks.length === 0}
        />
      </Card>

      {/* Activity Timeline */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Historique d'activité</h2>
      </div>

      {activityError && <Alert type="error" message={activityError} />}

      <Card>
        <Table
          columns={activityColumns}
          data={activities || []}
          isLoading={activityLoading}
          isEmpty={!activities || activities.length === 0}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Éditer l'organisation"
      >
        <OrganisationForm
          initialData={data}
          onSubmit={handleUpdate}
          isLoading={false}
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
              setLinkPayload((prev: any) => ({
                ...prev,
                person_id: Number(e.target.value),
              }))
            }
            placeholder="Ex: 21"
          />

          <Input
            label="Rôle / fonction"
            value={linkPayload.job_title || ''}
            onChange={(e) =>
              setLinkPayload((prev: any) => ({ ...prev, job_title: e.target.value || undefined }))
            }
          />

          <Input
            label="Email professionnel"
            value={linkPayload.work_email || ''}
            onChange={(e) =>
              setLinkPayload((prev: any) => ({ ...prev, work_email: e.target.value || undefined }))
            }
          />

          <Input
            label="Téléphone professionnel"
            value={linkPayload.work_phone || ''}
            onChange={(e) =>
              setLinkPayload((prev: any) => ({ ...prev, work_phone: e.target.value || undefined }))
            }
          />

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={linkPayload.is_primary ?? false}
              onChange={(e) =>
                setLinkPayload((prev: any) => ({ ...prev, is_primary: e.target.checked }))
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
