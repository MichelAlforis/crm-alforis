
// app/dashboard/fournisseurs/[id]/page.tsx
// ============= FOURNISSEUR DETAIL PAGE =============

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useFournisseurs } from '@/hooks/useFournisseurs'
import { useKPIsFournisseur } from '@/hooks/useKPIsFournisseur'
import { Card, Button, Table, Alert, Modal, Input } from '@/components/shared'
import { FournisseurForm } from '@/components/forms'
import { KPIForm } from '@/components/forms'
import { FournisseurDetail, KPICreate, PersonOrganizationLink, PersonOrganizationLinkInput } from '@/lib/types'
import { usePeople } from '@/hooks/usePeople'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'

export default function FournisseurDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const fournisseurId = React.useMemo(() => {
    const rawId = params?.id
    const parsed = rawId ? Number.parseInt(rawId, 10) : NaN
    return Number.isNaN(parsed) ? null : parsed
  }, [params])

  const { single: fournisseur, fetchFournisseur, updateFournisseur, delete: deleteOp, deleteFournisseur, update: updateOp } = useFournisseurs()
  const { kpis, fetchKPIs, createKPI, create: kpiCreate } = useKPIsFournisseur(fournisseurId ?? 0)
  const {
    linkPersonToOrganization,
    deletePersonOrganizationLink,
    updatePersonOrganizationLink,
  } = usePeople()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isKPIModalOpen, setIsKPIModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkError, setLinkError] = useState<string>()
  const [isLinkSubmitting, setIsLinkSubmitting] = useState(false)
  const [linkPayload, setLinkPayload] = useState<PersonOrganizationLinkInput>({
    person_id: 0,
    organization_type: 'fournisseur',
    organization_id: fournisseurId ?? 0,
    is_primary: false,
  })

  useEffect(() => {
    if (fournisseurId === null) {
      router.replace('/dashboard/fournisseurs')
      return
    }
    fetchFournisseur(fournisseurId)
    fetchKPIs()
  }, [fournisseurId, fetchFournisseur, fetchKPIs, router])

  useEffect(() => {
    setLinkPayload((prev) => ({
      ...prev,
      organization_id: fournisseurId ?? 0,
    }))
  }, [fournisseurId])

  const handleUpdate = async (data: any) => {
    if (fournisseurId === null) return
    await updateFournisseur(fournisseurId, data)
    setIsEditModalOpen(false)
  }

  const handleDelete = async () => {
    if (fournisseurId === null) return
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur?')) {
      await deleteFournisseur(fournisseurId)
      router.push('/dashboard/fournisseurs')
    }
  }

  const handleAddKPI = async (data: KPICreate) => {
    if (fournisseurId === null) return
    await createKPI(data)
    setIsKPIModalOpen(false)
  }

  if (fournisseurId === null) return <div className="text-center p-6">Fournisseur introuvable</div>
  if (fournisseur.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    )
  }
  if (!fournisseur.data) return <div className="text-center p-6">Non trouvé</div>

  const details = fournisseur.data as FournisseurDetail
  const data = details.fournisseur
  const peopleLinks = details.people || []

  const primaryLink = details.people.find((p) => p.is_primary) ?? details.people[0]
  const primaryContactName = primaryLink?.person
    ? `${primaryLink.person.first_name} ${primaryLink.person.last_name}`
    : '-'

  const kpiColumns = [
    { header: 'Année', accessor: 'year' },
    { header: 'Mois', accessor: 'month' },
    { header: 'RDV', accessor: 'rdv_count' },
    { header: 'Closings', accessor: 'closings' },
    { header: 'Revenu', accessor: 'revenue', render: (v: number) => `${v}€` },
    { header: 'Comm. %', accessor: 'commission_rate' },
  ]

  // Stats
  const totalRevenue = kpis.data?.reduce((sum, k) => sum + (k.revenue || 0), 0) || 0
  const totalClosings = kpis.data?.reduce((sum, k) => sum + (k.closings || 0), 0) || 0
  const totalRDV = kpis.data?.reduce((sum, k) => sum + (k.rdv_count || 0), 0) || 0

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
                fetchFournisseur(fournisseurId),
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
    if (fournisseurId === null) {
      setLinkError('Fournisseur invalide')
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
      await fetchFournisseur(fournisseurId)
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
    await fetchFournisseur(fournisseurId)
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
            <p className="text-sm text-gray-600">Secteur</p>
            <p className="font-medium text-sm">{data.activity || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Personne référente</p>
            <p className="font-medium text-sm">
              {primaryContactName}
            </p>
          </div>
        </div>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-bleu">{totalRDV}</div>
          <p className="text-gray-600 text-sm">RDV totaux</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-vert">{totalClosings}</div>
          <p className="text-gray-600 text-sm">Closings totaux</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-orange-500">{totalRevenue}€</div>
          <p className="text-gray-600 text-sm">Revenu total</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-500">{kpis.data?.length || 0}</div>
          <p className="text-gray-600 text-sm">Mois saisies</p>
        </Card>
      </div>

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
          data={peopleLinks.map((link) => ({
            ...link,
            personLabel: link.person
              ? `${link.person.first_name} ${link.person.last_name}`
              : `Personne #${link.person_id}`,
          }))}
          isLoading={fournisseur.isLoading}
          isEmpty={peopleLinks.length === 0}
        />
      </Card>

      {/* KPIs Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">KPIs</h2>
        <Button variant="primary" onClick={() => setIsKPIModalOpen(true)}>
          + Ajouter KPI
        </Button>
      </div>

      {kpis.error && <Alert type="error" message={kpis.error} />}

      <Card>
        <Table
          columns={kpiColumns}
          data={kpis.data || []}
          isLoading={kpis.isLoading}
          isEmpty={kpis.data?.length === 0}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Éditer le fournisseur"
      >
        <FournisseurForm
          initialData={data}
          onSubmit={handleUpdate}
          isLoading={updateOp.isLoading}
          error={updateOp.error}
          submitLabel="Mettre à jour"
        />
      </Modal>

      {/* Add KPI Modal */}
      <Modal
        isOpen={isKPIModalOpen}
        onClose={() => setIsKPIModalOpen(false)}
        title="Ajouter un KPI"
      >
        <KPIForm
          onSubmit={handleAddKPI}
          isLoading={kpiCreate.isLoading}
          error={kpiCreate.error}
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
            placeholder="Ex: 21"
          />

          <Input
            label="Rôle / fonction"
            value={linkPayload.job_title || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, job_title: e.target.value || undefined }))
            }
          />

          <Input
            label="Email professionnel"
            value={linkPayload.work_email || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, work_email: e.target.value || undefined }))
            }
          />

          <Input
            label="Téléphone professionnel"
            value={linkPayload.work_phone || ''}
            onChange={(e) =>
              setLinkPayload((prev) => ({ ...prev, work_phone: e.target.value || undefined }))
            }
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
