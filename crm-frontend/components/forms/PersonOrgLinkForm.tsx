'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OrganisationDetail, PersonOrganizationLinkInput } from '@/lib/types'
import { Alert, Button, Input } from '@/components/shared'
import { FieldContextMenu } from '@/components/ui/FieldContextMenu'
import { useAIAutofill } from '@/hooks/useAIAutofill'
import { apiClient } from '@/lib/api'

interface PersonOrgLinkFormProps {
  value: PersonOrganizationLinkInput
  onChange: React.Dispatch<React.SetStateAction<PersonOrganizationLinkInput>>
  onSubmit: () => void
  isSubmitting: boolean
  error?: string
  personName?: string
}

export function PersonOrgLinkForm({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  personName,
}: PersonOrgLinkFormProps) {
  const [selectedOrganisation, setSelectedOrganisation] = useState<OrganisationDetail | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadOrganisation = async () => {
      const organisationId = value.organization_id

      if (!organisationId || organisationId <= 0) {
        setSelectedOrganisation(null)
        return
      }

      try {
        const organisation = await apiClient.getOrganisation(organisationId)
        if (!cancelled) {
          setSelectedOrganisation(organisation)
        }
      } catch {
        if (!cancelled) {
          setSelectedOrganisation(null)
        }
      }
    }

    loadOrganisation()

    return () => {
      cancelled = true
    }
  }, [value.organization_id])

  const enrichedFormData = useMemo(
    () => ({
      organization_id: value.organization_id,
      job_title: value.job_title,
      work_email: value.work_email,
      work_phone: value.work_phone,
      is_primary: value.is_primary,
      person_id: value.person_id,
      person_name: personName,
      organisation_name: selectedOrganisation?.name,
    }),
    [
      personName,
      selectedOrganisation?.name,
      value.is_primary,
      value.job_title,
      value.organization_id,
      value.person_id,
      value.work_email,
      value.work_phone,
    ]
  )

  const {
    handleFieldRightClick,
    showContextMenu,
    menuPosition,
    activeField,
    handleAutofillSuggest,
  } = useAIAutofill({
    entityType: 'person_org_link',
    formData: enrichedFormData,
    onFieldUpdate: (fieldName, fieldValue) => {
      if (typeof fieldValue !== 'string') return

      const valueOrUndefined = fieldValue.trim() || undefined

      if (fieldName === 'job_title') {
        onChange((prev) => ({ ...prev, job_title: valueOrUndefined }))
      }

      if (fieldName === 'work_email') {
        onChange((prev) => ({ ...prev, work_email: valueOrUndefined }))
      }

      if (fieldName === 'work_phone') {
        onChange((prev) => ({ ...prev, work_phone: valueOrUndefined }))
      }
    },
  })

  return (
    <>
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {/* ✅ MIGRATION 2025-10-20: Type d'organisation supprimé */}
        <Input
          label="Identifiant organisation"
          type="number"
          value={value.organization_id ? String(value.organization_id) : ''}
          onChange={(e) => {
            const nextValue = Number(e.target.value)
            onChange((prev) => ({
              ...prev,
              organization_id: Number.isNaN(nextValue) ? 0 : nextValue,
            }))
          }}
          placeholder="Ex: 12"
        />

        <Input
          label="Rôle / fonction"
          value={value.job_title || ''}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, job_title: e.target.value || undefined }))
          }
          onContextMenu={(e) => handleFieldRightClick(e, 'job_title')}
          placeholder="ex: Responsable Distribution (clic-droit IA)"
        />

        <Input
          label="Email professionnel"
          value={value.work_email || ''}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, work_email: e.target.value || undefined }))
          }
          onContextMenu={(e) => handleFieldRightClick(e, 'work_email')}
          placeholder="prenom.nom@entreprise.com (clic-droit IA)"
        />

        <Input
          label="Téléphone professionnel"
          value={value.work_phone || ''}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, work_phone: e.target.value || undefined }))
          }
          onContextMenu={(e) => handleFieldRightClick(e, 'work_phone')}
          placeholder="+33 ..."
        />

        <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 dark:border-slate-600"
            checked={value.is_primary ?? false}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, is_primary: e.target.checked }))
            }
          />
          Marquer comme contact principal
        </label>

        <Button variant="primary" className="w-full" isLoading={isSubmitting} onClick={onSubmit}>
          Enregistrer le rattachement
        </Button>
      </div>

      <FieldContextMenu
        show={showContextMenu}
        position={menuPosition}
        fieldName={activeField}
        onAutofill={handleAutofillSuggest}
        onClose={() => {}}
      />
    </>
  )
}

