// app/dashboard/organisations/[id]/page.tsx
// ============= ORGANISATION DETAIL PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Power, PowerOff } from 'lucide-react'
import {
  useOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
} from '@/hooks/useOrganisations'
import { useMandatsByOrganisation } from '@/hooks/useMandats'
import { Card, Button, Alert, Modal, ConfirmDialog } from '@/components/shared'
import { OrganisationForm } from '@/components/forms'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import type { OrganisationUpdate } from '@/lib/types'
import { OrganisationTimeline } from '@/components/organisations/OrganisationTimeline'
import { useToast } from '@/hooks/useToast'
import { CampaignSubscriptionManager } from '@/components/email/CampaignSubscriptionManager'
import { ActivityTab } from '@/components/interactions/ActivityTab'

const CATEGORY_LABELS: Record<string, string> = {
  Institution: 'Institution',
  Wholesale: 'Wholesale',
  SDG: 'SDG',
  CGPI: 'CGPI',
  Startup: 'Startup',
  Corporation: 'Corporation',
  Autres: 'Autres',
}

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_NEGOCIATION: 'En négociation',
  SIGNE: 'Signé',
  ACTIF: 'Actif',
  EXPIRE: 'Expiré',
  RESILIE: 'Résilié',
}

type TabType = 'informations' | 'activite'

export default function OrganisationDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('informations')

  const organisationId = React.useMemo(() => {
    const rawId = params?.id
    const parsed = rawId ? Number.parseInt(rawId, 10) : NaN
    return Number.isNaN(parsed) ? null : parsed
  }, [params])

  const { data: organisation, isLoading, error } = useOrganisation(organisationId ?? 0)
  const { data: mandats } = useMandatsByOrganisation(organisationId ?? 0)
  const updateMutation = useUpdateOrganisation()
  const deleteMutation = useDeleteOrganisation()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isInactivating, setIsInactivating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'deactivate' | 'reactivate' | 'delete'
  }>({ isOpen: false, type: 'deactivate' })

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
    } catch (err) {
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
      await deleteMutation.mutateAsync(organisationId)
      showToast({
        type: 'success',
        title: 'Organisation supprimée avec succès',
      })
      setConfirmDialog({ isOpen: false, type: 'delete' })
      setTimeout(() => {
        router.push('/dashboard/organisations')
      }, 500)
    } catch (err) {
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

  const mandatColumns = [
    {
      header: 'N° Mandat',
      accessor: 'numero_mandat',
      render: (value: string | null) => value || '-',
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'ACTIF' || value === 'SIGNE'
              ? 'bg-green-100 text-green-800'
              : value === 'EXPIRE' || value === 'RESILIE'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {STATUS_LABELS[value] || value}
        </span>
      ),
    },
    {
      header: 'Date début',
      accessor: 'date_debut',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Date fin',
      accessor: 'date_fin',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : 'Indéterminée',
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <Link href={`/dashboard/mandats/${id}`} className="text-bleu hover:underline text-sm">
          Voir
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/dashboard/organisations"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Annuaire</span>
        </Link>
        <span className="text-gray-400">•</span>
        <span className="text-sm text-gray-600">Organisations</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">{organisation.name}</h1>
          <p className="text-gray-600 mt-1">
            {CATEGORY_LABELS[organisation.category]} •{' '}
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
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('informations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'informations'
                ? 'border-bleu text-bleu'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Informations
          </button>
          <button
            onClick={() => setActiveTab('activite')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'activite'
                ? 'border-bleu text-bleu'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activité
          </button>
        </nav>
      </div>

      {/* Tab Content - Informations */}
      {activeTab === 'informations' && (
        <>
          {/* Informations générales */}
          <Card>
        <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{organisation.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Téléphone</p>
            <p className="font-medium">{organisation.main_phone || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600 mb-2">Statut emails marketing</p>
            {organisation.email_unsubscribed ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  🚫 Désinscrit des emails marketing
                </span>
                <span className="text-xs text-gray-500">
                  (Conformité RGPD - Aucun email ne sera envoyé)
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✅ Abonné aux emails marketing
              </span>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Site web</p>
            <p className="font-medium">
              {organisation.website ? (
                <a
                  href={organisation.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bleu hover:underline"
                >
                  {organisation.website}
                </a>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Adresse</p>
            <p className="font-medium">{organisation.address || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pays</p>
            <p className="font-medium">{getCountryLabel(organisation.country_code)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Langue</p>
            <p className="font-medium">{getLanguageLabel(organisation.language)}</p>
          </div>
        </div>
      </Card>

      {/* Contacts */}
      {organisation.people_links && organisation.people_links.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">
            Contacts ({organisation.people_links.length})
          </h2>
          <div className="space-y-3">
            {organisation.people_links.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/people/${link.person?.id}`}
                      className="font-medium text-bleu hover:underline"
                    >
                      {link.person?.first_name} {link.person?.last_name}
                    </Link>
                    {link.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    {link.job_title && <span>{link.job_title}</span>}
                    {link.work_email && <span>{link.work_email}</span>}
                    {link.work_phone && <span>{link.work_phone}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
              <span className="text-gray-600">Date de signature</span>
              <span className="font-medium text-gray-900">
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
              <span className="text-gray-600">Statut</span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  mandats[0].status === 'ACTIF' || mandats[0].status === 'SIGNE'
                    ? 'bg-green-100 text-green-800'
                    : mandats[0].status === 'EXPIRE' || mandats[0].status === 'RESILIE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {STATUS_LABELS[mandats[0].status] || mandats[0].status}
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
        <OrganisationForm
          initialData={organisation}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          error={updateMutation.error?.message}
          submitLabel="Enregistrer"
        />
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
