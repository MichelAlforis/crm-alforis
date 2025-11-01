'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { ROUTES } from "@/lib/constants"
import { Modal } from '@/components/shared'
import { PersonForm, PersonOrgLinkForm } from '@/components/forms'
import { usePeople } from '@/hooks/usePeople'
import { useConfirm } from '@/hooks/useConfirm'
import { useEntityDetail } from '@/hooks/useEntityDetail'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { CampaignSubscriptionManager } from '@/components/email/CampaignSubscriptionManager'
import { ActivityTab } from '@/components/interactions/ActivityTab'
import type { PersonOrganizationLinkInput, PersonOrganizationLink } from '@/lib/types'

// Composants extraits
import { PersonDetailHeader } from '@/components/people/PersonDetailHeader'
import { PersonInfoCard } from '@/components/people/PersonInfoCard'
import { PersonOrganizationsSection } from '@/components/people/PersonOrganizationsSection'

interface _OrganizationLinkRow extends PersonOrganizationLink {
  organizationLabel: string
  personLabel: string
}

type TabType = 'informations' | 'activite'

export default function PersonDetailPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()

  const {
    entityId: personIdFromHook,
    isEditModalOpen,
    setIsEditModalOpen,
    activeTab,
    setActiveTab,
    handleDeleteWithRedirect,
  } = useEntityDetail<TabType>({ listRoute: ROUTES.CRM.PEOPLE })

  const personId = personIdFromHook

  const {
    single,
    fetchPerson,
    updatePerson,
    deletePerson,
    update,
    remove,
    updatePersonOrganizationLink,
    deletePersonOrganizationLink,
    linkPersonToOrganization,
  } = usePeople()

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkPayload, setLinkPayload] = useState<PersonOrganizationLinkInput>({
    person_id: personId ?? 0,
    organization_id: 0,
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
    setLinkPayload((prev: PersonOrganizationLinkInput) => ({
      ...prev,
      person_id: personId ?? 0,
    }))
  }, [personId])

  const person = single.data
  const personName = person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : ''

  const organizationRows = useMemo(() => {
    return (
      person?.organizations.map((link) => ({
        ...link,
        organizationLabel: link.organization_name || `Organisation #${link.organization_id}`,
        personLabel: link.person ? `${link.person.first_name} ${link.person.last_name}` : '',
      })) || []
    )
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
          await handleDeleteWithRedirect(async () => {
            showToast({
              type: 'success',
              title: 'Contact supprimé',
              message: 'Le contact a été supprimé avec succès.',
            })
          })
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
      await linkPersonToOrganization(personId, linkPayload.organization_id, linkPayload)
      setIsLinkModalOpen(false)
      setLinkPayload({
        person_id: personId,
        organization_id: 0,
        is_primary: false,
      })
      showToast({
        type: 'success',
        title: 'Association créée',
        message: 'La personne a été associée à l\'organisation.',
      })
      await refresh()
    } catch (error: any) {
      setLinkError(error?.detail || 'Impossible de créer le lien')
    } finally {
      setIsLinkSubmitting(false)
    }
  }

  const handleDeleteLinkClick = (linkId: number) => {
    confirm({
      title: 'Supprimer ce rattachement ?',
      message: 'Cette action est définitive.',
      type: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        try {
          await deletePersonOrganizationLink(linkId)
          showToast({
            type: 'success',
            title: 'Rattachement supprimé',
          })
          await refresh()
        } catch (error: any) {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: error?.detail || 'Impossible de supprimer le rattachement.',
          })
        }
      },
    })
  }

  if (single.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    )
  }

  if (personId === null || !person) {
    return <div className="p-8 text-center text-gray-500">Personne introuvable</div>
  }

  return (
    <PageContainer width="default">
      <PersonDetailHeader
        person={person}
        onEdit={() => setIsEditModalOpen(true)}
        onDelete={handleDeleteClick}
        isDeleting={remove.isLoading}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('informations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'informations'
                ? 'border-bleu text-bleu'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:border-slate-600'
            }`}
          >
            Informations
          </button>
          <button
            onClick={() => setActiveTab('activite')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'activite'
                ? 'border-bleu text-bleu'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:border-slate-600'
            }`}
          >
            Activité
          </button>
        </nav>
      </div>

      {/* Tab Content - Informations */}
      {activeTab === 'informations' && (
        <>
          <PersonInfoCard person={person} />

          <PersonOrganizationsSection
            organizationRows={organizationRows}
            isLoading={single.isLoading}
            onUpdateLink={updatePersonOrganizationLink}
            onDeleteLink={handleDeleteLinkClick}
            onAddClick={() => setIsLinkModalOpen(true)}
          />

          <CampaignSubscriptionManager
            entityType="person"
            entityId={personId}
            entityName={`${person.first_name} ${person.last_name}`}
          />
        </>
      )}

      {/* Tab Content - Activité */}
      {activeTab === 'activite' && personId && (
        <ActivityTab personId={personId} canCreate={true} />
      )}

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier la fiche">
        <PersonForm
          initialData={person}
          onSubmit={handleUpdatePerson}
          isLoading={update.isLoading}
          error={update.error}
          submitLabel="Mettre à jour"
        />
      </Modal>

      {/* Link Modal */}
      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Associer à une organisation">
        <PersonOrgLinkForm
          value={linkPayload}
          onChange={setLinkPayload}
          onSubmit={handleCreateLink}
          isSubmitting={isLinkSubmitting}
          error={linkError}
          personName={personName}
        />
      </Modal>

      <ConfirmDialogComponent />
    </PageContainer>
  )
}
