// components/forms/PersonOrgLinkForm.tsx
// Form to create Person <--> Organisation link with AI autofill

'use client'

import React, { useState } from 'react'
import { Input } from '@/components/shared/Input'
import { ModalForm } from '@/components/shared/Modal'
import { storage, AUTH_STORAGE_KEYS } from '@/lib/constants'
import { useAIAutofill } from '@/hooks/useAIAutofill'
import { FieldContextMenu } from '@/components/ui/FieldContextMenu'

interface PersonOrgLinkFormProps {
  isOpen: boolean
  onClose: () => void
  personId: number
  personName: string
  onSuccess?: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export default function PersonOrgLinkForm({
  isOpen,
  onClose,
  personId,
  personName,
  onSuccess,
}: PersonOrgLinkFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [organisationId, setOrganisationId] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [workPhone, setWorkPhone] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [notes, setNotes] = useState('')

  // AI Autofill hook with enriched context
  const {
    handleFieldRightClick,
    showContextMenu,
    menuPosition,
    activeField,
    handleAutofillSuggest,
  } = useAIAutofill({
    entityType: 'person_org_link',
    formData: {
      job_title: jobTitle,
      work_email: workEmail,
      work_phone: workPhone,
      notes,
      person_name: personName,
      organisation_name: organisationName,
    },
    onFieldUpdate: (fieldName, value) => {
      if (fieldName === 'job_title') setJobTitle(value)
      if (fieldName === 'work_email') setWorkEmail(value)
      if (fieldName === 'work_phone') setWorkPhone(value)
      if (fieldName === 'notes') setNotes(value)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN) || storage.get(AUTH_STORAGE_KEYS.LEGACY_TOKEN)

      const linkData = {
        person_id: personId,
        organisation_id: parseInt(organisationId, 10),
        job_title: jobTitle || undefined,
        work_email: workEmail || undefined,
        work_phone: workPhone || undefined,
        is_primary: isPrimary,
        notes: notes || undefined,
      }

      const response = await fetch(`${API_BASE}/org-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(linkData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create link')
      }

      // Success
      if (onSuccess) onSuccess()
      onClose()

      // Reset form
      setOrganisationId('')
      setOrganisationName('')
      setJobTitle('')
      setWorkEmail('')
      setWorkPhone('')
      setIsPrimary(false)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title={`Associer ${personName} à une organisation`}
      onSubmit={handleSubmit}
      submitLabel="Créer le lien"
      isLoading={loading}
      error={error}
      size="md"
      submitDisabled={!organisationId}
    >
      <div className="space-y-4">
        {/* Organisation selector - simplified, in production use a proper autocomplete */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Organisation *
          </label>
          <input
            type="number"
            value={organisationId}
            onChange={(e) => setOrganisationId(e.target.value)}
            required
            placeholder="ID de l'organisation"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            TODO: Remplacer par un autocomplete avec recherche
          </p>
        </div>

        {/* Organisation name (for AI context enrichment) */}
        <Input
          label="Nom de l'organisation (pour contexte IA)"
          type="text"
          value={organisationName}
          onChange={(e) => setOrganisationName(e.target.value)}
          placeholder="Ex: Banque Populaire, ALFORIS, etc."
        />

        {/* Job title with Autofill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fonction / Poste
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            onContextMenu={(e) => handleFieldRightClick(e, 'job_title')}
            placeholder="Ex: Directeur d'Agence (clic-droit IA)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Work email with Autofill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email professionnel
          </label>
          <input
            type="email"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            onContextMenu={(e) => handleFieldRightClick(e, 'work_email')}
            placeholder="Ex: prenom.nom@organisation.fr (clic-droit IA)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Work phone with Autofill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Téléphone professionnel
          </label>
          <input
            type="tel"
            value={workPhone}
            onChange={(e) => setWorkPhone(e.target.value)}
            onContextMenu={(e) => handleFieldRightClick(e, 'work_phone')}
            placeholder="Ex: +33 1 23 45 67 89 (clic-droit IA)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Is primary checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPrimary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
          />
          <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Contact principal dans cette organisation
          </label>
        </div>

        {/* Notes with Autofill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onContextMenu={(e) => handleFieldRightClick(e, 'notes')}
            rows={3}
            placeholder="Notes sur ce lien... (clic-droit IA)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* AI Autofill Context Menu */}
      <FieldContextMenu
        show={showContextMenu}
        position={menuPosition}
        fieldName={activeField}
        onAutofill={handleAutofillSuggest}
        onClose={() => {}}
      />
    </ModalForm>
  )
}
