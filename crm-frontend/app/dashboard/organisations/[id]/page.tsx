// app/dashboard/organisations/[id]/page.tsx
// ============= ORGANISATION DETAIL PAGE =============

'use client'

import React, { useState, lazy, Suspense } from 'react'
import Link from 'next/link'
import { ROUTES } from "@/lib/constants"
import { ArrowLeft, Power, PowerOff } from 'lucide-react'
import {
  useOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
} from '@/hooks/useOrganisations'
import { useMandatsByOrganisation } from '@/hooks/useMandats'
import { Card, Button, Alert, Modal, ConfirmDialog } from '@/components/shared'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { OrganisationUpdate } from '@/lib/types'
import { ORGANISATION_CATEGORY_LABELS, ORGANISATION_STATUS_LABELS } from "@/lib/enums/labels"
import { OrganisationTimeline } from '@/components/organisations/OrganisationTimeline'
import { useToast } from '@/hooks/useToast'
import { CampaignSubscriptionManager } from '@/components/email/CampaignSubscriptionManager'
import { ActivityTab } from '@/components/interactions/ActivityTab'
import { useEntityDetail } from '@/hooks/useEntityDetail'

// Composants extraits
import { OrganisationInfoCard } from '@/components/organisations/OrganisationInfoCard'
import { OrganisationContactsList } from '@/components/organisations/OrganisationContactsList'

// Lazy load heavy form component (loaded only when modal opens)
const OrganisationForm = lazy(() => import('@/components/forms').then(m => ({ default: m.OrganisationForm })))

type TabType = 'informations' | 'activite'

export default function OrganisationDetailPage() {
  const { showToast } = useToast()

  const {
    entityId: organisationId,
    isEditModalOpen,
    setIsEditModalOpen,
    confirmDialog,
    setConfirmDialog,
    activeTab,
    setActiveTab,
    handleDeleteWithRedirect,
  } = useEntityDetail<TabType>({ listRoute: ROUTES.CRM.ORGANISATIONS })

  const { data: organisation, isLoading, error } = useOrganisation(organisationId ?? 0)
  const { data: mandats } = useMandatsByOrganisation(organisationId ?? 0)
  const updateMutation = useUpdateOrganisation()
  const deleteMutation = useDeleteOrganisation()

  const [isInactivating, setIsInactivating] = useState(false)

  const handleUpdate = async (data: OrganisationUpdate) => {
    if (!organisationId) return
    await updateMutation.mutateAsync({ id: organisationId, data })
    setIsEditModalOpen(false)
    showToast({
      type: 'success',
      title: 'Organisation mise à jour avec succès',
    })
  }

  // Open confirmation dialog for toggle status
  const handleToggleStatusClick = () => {
    if (!organisation) return
    setConfirmDialog({
      isOpen: true,
      type: organisation.is_active ? 'deactivate' : 'reactivate',
    })
  }

  // Toggle active/inactive status
  const handleToggleStatus = async () => {
    if (!organisationId || !organisation) return

    const newStatus = !organisation.is_active

    try {
      setIsInactivating(true)
      await updateMutation.mutateAsync({
        id: organisationId,
        data: { is_active: newStatus },
      })
      showToast({
        type: 'success',
        title: `Organisation ${newStatus ? 'réactivée' : 'désactivée'} avec succès`,
      })
      setConfirmDialog({ isOpen: false, type: 'deactivate' })
    } catch (_error) {
      showToast({
        type: 'error',
        title: `Erreur lors de ${newStatus ? 'la réactivation' : 'la désactivation'}`,
      })
    } finally {
      setIsInactivating(false)
    }
  }

  // Open confirmation dialog for delete
  const handleDeleteClick = () => {
    if (!organisation) return

    if (organisation.is_active) {
      showToast({
        type: 'error',
        title: 'Vous devez d\'abord désactiver l\'organisation avant de la supprimer',
      })
      return
    }

    setConfirmDialog({ isOpen: true, type: 'delete' })
  }

  // Delete only for inactive organisations
  const handleDelete = async () => {
    if (!organisationId || !organisation) return

    try {
      await handleDeleteWithRedirect(async () => {
        await deleteMutation.mutateAsync(organisationId)
        showToast({
          type: 'success',
          title: 'Organisation supprimée avec succès',
        })
      })
    } catch (_error) {
      showToast({
        type: 'error',
        title: 'Erreur lors de la suppression',
      })
    }
  }

  if (organisationId === null) {
    return <div className="text-center p-6">Organisation introuvable</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !organisation) {
    return (
      <div className="text-center p-6">
        <Alert type="error" message="Organisation non trouvée" />
      </div>
    )
  }

  const getCountryLabel = (code?: string | null) => {
    if (!code) return '-'
    const country = COUNTRY_OPTIONS.find((option) => option.code === code)
    return country ? `${country.flag} ${country.name}` : code
  }

  const getLanguageLabel = (code?: string | null) => {
    if (!code) return '-'
    const lang = LANGUAGE_OPTIONS.find((option) => option.code === code)
    return lang ? `${lang.flag} ${lang.name}` : code
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/dashboard/organisations"
          className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white dark:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Annuaire</span>
        </Link>
        <span className="text-gray-400">•</span>
        <span className="text-sm text-gray-600 dark:text-slate-400">Organisations</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">{organisation.name}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            {ORGANISATION_CATEGORY_LABELS[organisation.category]} •{' '}
            {organisation.is_active ? (
              <span className="text-green-600 font-medium">Active</span>
            ) : (
              <span className="text-gray-500 font-medium">Inactive</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Modifier
          </Button>
          <Button
            variant={organisation.is_active ? 'danger' : 'primary'}
            onClick={handleToggleStatusClick}
            disabled={isInactivating || updateMutation.isPending}
          >
            {isInactivating ? (
              'Chargement...'
            ) : organisation.is_active ? (
              <>
                <PowerOff className="w-4 h-4 mr-1" />
                Désactiver
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-1" />
                Réactiver
              </>
            )}
          </Button>
          {!organisation.is_active && (
            <Button variant="danger" onClick={handleDeleteClick} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          )}
        </div>
      </div>

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
          <OrganisationInfoCard organisation={organisation} />
          <OrganisationContactsList contacts={organisation.people_links || []} />

      {/* Mandats - Simplified view */}
      {mandats && mandats.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Mandat</h2>
            <Link href={`/dashboard/mandats/${mandats[0].id}`}>
              <Button variant="secondary" size="sm">
                Voir détails
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Date de signature</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {mandats[0].date_debut
                  ? new Date(mandats[0].date_debut).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Statut</span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  mandats[0].status === 'ACTIF' || mandats[0].status === 'SIGNE'
                    ? 'bg-green-100 text-green-800'
                    : mandats[0].status === 'EXPIRE' || mandats[0].status === 'RESILIE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {ORGANISATION_STATUS_LABELS[mandats[0].status] || mandats[0].status}
              </span>
            </div>
          </div>
        </Card>
      )}

          {organisationId && <OrganisationTimeline organisationId={organisationId} />}

          {/* Campaign Subscriptions */}
          {organisationId && (
            <CampaignSubscriptionManager
              entityType="organisation"
              entityId={organisationId}
              entityName={organisation.name}
            />
          )}
        </>
      )}

      {/* Tab Content - Activité */}
      {activeTab === 'activite' && organisationId && (
        <ActivityTab orgId={organisationId} canCreate={true} />
      )}

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier l'organisation"
      >
        <Suspense fallback={<div className="p-4">Chargement...</div>}>
          <OrganisationForm
            initialData={organisation}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
            error={updateMutation.error?.message}
            submitLabel="Enregistrer"
          />
        </Suspense>
      </Modal>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'deactivate'}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'deactivate' })}
        onConfirm={handleToggleStatus}
        type="warning"
        title="Désactiver l'organisation ?"
        message={`Êtes-vous sûr de vouloir désactiver ${organisation.name} ? L'organisation ne sera plus visible dans les listes actives mais pourra être réactivée à tout moment.`}
        confirmText="Désactiver"
        cancelText="Annuler"
        isLoading={isInactivating}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'reactivate'}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'reactivate' })}
        onConfirm={handleToggleStatus}
        type="success"
        title="Réactiver l'organisation ?"
        message={`Êtes-vous sûr de vouloir réactiver ${organisation.name} ? L'organisation sera à nouveau visible et active dans le système.`}
        confirmText="Réactiver"
        cancelText="Annuler"
        isLoading={isInactivating}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete' })}
        onConfirm={handleDelete}
        type="danger"
        title="Supprimer définitivement ?"
        message={`Cette action est irréversible. ${organisation.name} et tous les mandats associés seront définitivement supprimés. Voulez-vous continuer ?`}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
