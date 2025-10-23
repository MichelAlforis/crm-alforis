'use client'

// app/dashboard/people/[id]/page.tsx
// ============= PERSON DETAIL PAGE =============

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Alert, Table, Modal, Input } from '@/components/shared'
import { PersonForm } from '@/components/forms'
import { usePeople } from '@/hooks/usePeople'
import { useConfirm } from '@/hooks/useConfirm'
import { PersonOrganizationLinkInput } from '@/lib/types'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'
import { extractIdFromSlug } from '@/lib/utils'
import { CampaignSubscriptionManager } from '@/components/email/CampaignSubscriptionManager'

// ✅ MIGRATION 2025-10-20: ORGANIZATION_OPTIONS supprimé
// Le type d'organisation est maintenant stocké dans Organisation.category
// const ORGANIZATION_OPTIONS = [
//   { value: 'investor', label: 'Investisseur' },
//   { value: 'fournisseur', label: 'Fournisseur' },
// ]

export default function PersonDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const personId = useMemo(() => {
    const rawId = params?.id
    if (!rawId) return null

    // Try to extract ID from slug format: "123-john-doe" -> 123
    const idFromSlug = extractIdFromSlug(rawId)
    if (idFromSlug !== null) return idFromSlug

    // Fallback: try to parse as direct number (legacy URLs)
    const parsed = Number.parseInt(rawId, 10)
    return Number.isNaN(parsed) ? null : parsed
  }, [params])

  const { single, fetchPerson, updatePerson, deletePerson, update, remove, linkPersonToOrganization, updatePersonOrganizationLink, deletePersonOrganizationLink } = usePeople()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkPayload, setLinkPayload] = useState<PersonOrganizationLinkInput>({
    person_id: personId ?? 0,
    organization_id: 0,  // ✅ MIGRATION: organization_type supprimé
    is_primary: false,
  })
  const [linkError, setLinkError] = useState<string>()
  const [isLinkSubmitting, setIsLinkSubmitting] = useState(false)

  useEffect(() => {
    if (personId === null) {
      router.replace('/dashboard/people')
      return
    }
    fetchPerson(personId)
  }, [personId, fetchPerson, router])

  useEffect(() => {
    setLinkPayload((prev) => ({
      ...prev,
      person_id: personId ?? 0,
    }))
  }, [personId])

  const person = single.data
  const countryValue = person?.country_code || ''
  const countryLabel =
    countryValue
      ? COUNTRY_OPTIONS.find((option) => option.value === countryValue)?.label || countryValue
      : '-'
  const languageValue = person?.language || ''
  const languageLabel =
    languageValue
      ? LANGUAGE_OPTIONS.find((option) => option.value === languageValue)?.label || languageValue
      : '-'

  const organizationRows = useMemo(() => {
    return person?.organizations.map((link) => ({
      ...link,
      organizationLabel:
        link.organization_name || `Organisation #${link.organization_id}`,  // ✅ MIGRATION: Unifié
      personLabel: link.person
        ? `${link.person.first_name} ${link.person.last_name}`
        : '',
    })) || []
  }, [person])

  const refresh = async () => {
    if (personId !== null) {
      await fetchPerson(personId)
    }
  }

  const handleUpdatePerson = async (data: Parameters<typeof updatePerson>[1]) => {
    if (personId === null) return
    await updatePerson(personId, data)
    setIsEditModalOpen(false)
  }

  const handleDeleteClick = () => {
    if (personId === null) return
    if (remove.isLoading) return

    confirm({
      title: 'Supprimer cette personne ?',
      message: 'Cette action est définitive et irréversible.',
      type: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        try {
          await deletePerson(personId)
          showToast({
            type: 'success',
            title: 'Contact supprimé',
            message: 'Le contact a été supprimé avec succès.',
          })
          // Attendre un peu pour que le toast s'affiche avant la redirection
          setTimeout(() => {
            router.push('/dashboard/people')
          }, 500)
        } catch (error: any) {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: error?.detail || 'Impossible de supprimer le contact.',
          })
        }
      },
    })
  }

  const handleCreateLink = async () => {
    if (personId === null) {
      setLinkError('Personne introuvable')
      return
    }
    if (!linkPayload.organization_id || linkPayload.organization_id <= 0) {
      setLinkError('Identifiant organisation invalide')
      return
    }
    setIsLinkSubmitting(true)
    setLinkError(undefined)
    try {
      await linkPersonToOrganization(linkPayload)
      setIsLinkModalOpen(false)
      setLinkPayload({
        person_id: personId,
        organization_id: 0,  // ✅ MIGRATION: organization_type supprimé
        is_primary: false,
      })
      await refresh()
    } catch (error: any) {
      setLinkError(error?.detail || 'Erreur lors de la création du rattachement')
    } finally {
      setIsLinkSubmitting(false)
    }
  }

  const handleDeleteLinkClick = (linkId: number) => {
    confirm({
      title: 'Retirer ce rattachement ?',
      message: 'La personne ne sera plus liée à cette organisation.',
      type: 'warning',
      confirmText: 'Retirer',
      onConfirm: async () => {
        await deletePersonOrganizationLink(linkId)
        await refresh()
        showToast({
          type: 'success',
          title: 'Rattachement retiré',
        })
      },
    })
  }

  const linkColumns = [
    {
      header: 'Organisation',
      accessor: 'organizationLabel',
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
      header: 'Téléphone',
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
              updatePersonOrganizationLink(row.id, { is_primary: !row.is_primary }).then(refresh)
            }
          >
            {row.is_primary ? 'Retirer' : 'Définir principal'}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="text-rouge"
            onClick={() => handleDeleteLinkClick(row.id)}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ]

  if (single.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    )
  }

  if (personId === null) {
    return <div className="p-8 text-center text-gray-500">Personne introuvable</div>
  }

  if (!person) {
    return <div className="p-8 text-center text-gray-500">Personne introuvable</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/people" className="text-bleu hover:underline text-sm mb-2 block">
            ← Retour à l’annuaire
          </Link>
          <h1 className="text-3xl font-bold text-ardoise">
            {person.first_name} {person.last_name}
          </h1>
          {person.role && <p className="text-sm text-gray-500 mt-1">{person.role}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Éditer
          </Button>
          <Button variant="danger" onClick={handleDeleteClick} isLoading={remove.isLoading}>
            Supprimer
          </Button>
        </div>
      </div>

      <Card padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Email personnel</p>
            <p className="font-medium text-sm">{person.personal_email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Mobile</p>
            <p className="font-medium text-sm">{person.personal_phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pays</p>
            <p className="font-medium text-sm">{countryLabel}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Langue préférée</p>
            <p className="font-medium text-sm">{languageLabel}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">LinkedIn</p>
            {person.linkedin_url ? (
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bleu hover:underline text-sm"
              >
                Voir le profil
              </a>
            ) : (
              <p className="text-sm text-gray-500">-</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Notes</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">
              {person.notes || '-'}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ardoise">Rattachements</h2>
        <Button variant="primary" onClick={() => setIsLinkModalOpen(true)}>
          + Associer une organisation
        </Button>
      </div>

      <Card>
        <Table
          columns={linkColumns}
          data={organizationRows}
          isLoading={single.isLoading}
          isEmpty={organizationRows.length === 0}
        />
      </Card>

      {/* Campaign Subscriptions */}
      <CampaignSubscriptionManager
        entityType="person"
        entityId={personId}
        entityName={`${person.first_name} ${person.last_name}`}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier la fiche"
      >
        <PersonForm
          initialData={person}
          onSubmit={handleUpdatePerson}
          isLoading={update.isLoading}
          error={update.error}
          submitLabel="Mettre à jour"
        />
      </Modal>

      {/* Link Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Associer à une organisation"
      >
        <div className="space-y-4">
          {linkError && <Alert type="error" message={linkError} />}

          {/* ✅ MIGRATION 2025-10-20: Type d'organisation supprimé */}
          {/* Le type est maintenant stocké dans Organisation.category */}

          <Input
            label="Identifiant organisation"
            type="number"
            value={linkPayload.organization_id ? String(linkPayload.organization_id) : ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({
                ...prev,
                organization_id: Number(e.target.value),
              }))
            }
            placeholder="Ex: 12"
          />

          <Input
            label="Rôle / fonction"
            value={linkPayload.job_title || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, job_title: e.target.value || undefined }))
            }
            placeholder="ex: Responsable Distribution"
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
            Enregistrer le rattachement
          </Button>
        </div>
      </Modal>

      {/* Confirmation Dialogs */}
      <ConfirmDialogComponent />
    </div>
  )
}
