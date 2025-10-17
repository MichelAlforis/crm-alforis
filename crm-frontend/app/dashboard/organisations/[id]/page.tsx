// app/dashboard/organisations/[id]/page.tsx
// ============= ORGANISATION DETAIL PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  useOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
} from '@/hooks/useOrganisations'
import { useMandatsByOrganisation } from '@/hooks/useMandats'
import { Card, Button, Table, Alert, Modal } from '@/components/shared'
import { OrganisationForm } from '@/components/forms'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import type { OrganisationUpdate } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  DISTRIBUTEUR: 'Distributeur',
  EMETTEUR: 'Émetteur',
  FOURNISSEUR_SERVICE: 'Fournisseur de service',
  PARTENAIRE: 'Partenaire',
  AUTRE: 'Autre',
  Institution: 'Institution',
  Wholesale: 'Wholesale',
  SDG: 'SDG',
  CGPI: 'CGPI',
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

export default function OrganisationDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
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

  const handleUpdate = async (data: OrganisationUpdate) => {
    if (!organisationId) return
    await updateMutation.mutateAsync({ id: organisationId, data })
    setIsEditModalOpen(false)
  }

  const handleDelete = async () => {
    if (!organisationId) return
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer cette organisation ? Cette action est irréversible et supprimera également tous les mandats associés."
      )
    ) {
      await deleteMutation.mutateAsync(organisationId)
      router.push('/dashboard/organisations')
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">{organisation.name}</h1>
          <p className="text-gray-600 mt-1">
            {CATEGORY_LABELS[organisation.category]} •{' '}
            {organisation.is_active ? (
              <span className="text-green-600">Active</span>
            ) : (
              <span className="text-gray-500">Inactive</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Modifier
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>

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

      {/* Mandats */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Mandats de distribution ({mandats?.length || 0})
          </h2>
          <Link href={`/dashboard/mandats/new?organisation_id=${organisationId}`}>
            <Button variant="primary" size="sm">
              + Nouveau mandat
            </Button>
          </Link>
        </div>

        {mandats && mandats.length > 0 ? (
          <Table columns={mandatColumns} data={mandats} isLoading={false} isEmpty={false} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            Aucun mandat de distribution pour cette organisation.
          </div>
        )}
      </Card>

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
    </div>
  )
}
