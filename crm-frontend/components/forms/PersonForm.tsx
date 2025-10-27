// components/forms/PersonForm.tsx
// ============= PERSON FORM - RÉUTILISABLE =============

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Person, PersonInput } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { useAutofillV2, type AutofillSuggestion } from '@/hooks/useAutofillV2'
import { SuggestionPill } from '@/components/autofill/SuggestionPill'

interface PersonFormProps {
  initialData?: Person
  onSubmit: (data: PersonInput) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

export function PersonForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: PersonFormProps) {
  const { showToast } = useToast()
  const firstErrorRef = useRef<HTMLInputElement>(null)
  const { autofill, isLoading: isAutofilling } = useAutofillV2()
  const [suggestions, setSuggestions] = useState<Record<string, AutofillSuggestion>>({})

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
    watch,
    setValue,
  } = useForm<PersonInput>({
    defaultValues: {
      ...initialData,
      country_code: initialData?.country_code ?? undefined,
      language: initialData?.language ?? undefined,
    },
    mode: 'onBlur',
  })

  const formValues = watch()

  // Debug flag
  const DBG = process.env.NEXT_PUBLIC_DEBUG_AUTOFILL === '1'

  // Focus automatique sur le premier champ en erreur
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0] as keyof PersonInput
    if (firstErrorField) {
      setFocus(firstErrorField)
    }
  }, [errors, setFocus])

  // Trigger autofill when email is entered
  const handleEmailBlur = async () => {
    const email = formValues.personal_email
    if (!email || email.length < 5) return

    if (DBG) console.debug('[PersonForm] Triggering autofill', { email })

    try {
      const result = await autofill({
        entity_type: 'person',
        draft: {
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          personal_email: email,
        },
        context: {
          budget_mode: 'normal',
          outlook_enabled: true,
        },
      })

      // Auto-apply high confidence suggestions
      const autoApplied: string[] = []
      Object.entries(result.autofill).forEach(([field, suggestion]) => {
        if (suggestion.auto_apply) {
          setValue(field as keyof PersonInput, suggestion.value)
          autoApplied.push(field)
        }
      })
      if (DBG && autoApplied.length > 0) {
        console.debug('[PersonForm] Auto-applied fields', autoApplied)
      }

      // Store non-auto suggestions for manual review
      const manualSuggestions = Object.entries(result.autofill)
        .filter(([_, suggestion]) => !suggestion.auto_apply)
        .reduce((acc, [field, suggestion]) => {
          acc[field] = suggestion
          return acc
        }, {} as Record<string, AutofillSuggestion>)

      setSuggestions(manualSuggestions)
      if (DBG && Object.keys(manualSuggestions).length > 0) {
        console.debug('[PersonForm] Manual suggestions', Object.keys(manualSuggestions))
      }
    } catch (err) {
      console.error('[PersonForm] Autofill error:', err)
    }
  }

  const handleAcceptSuggestion = (field: string, value: any) => {
    if (DBG) console.debug('[PersonForm] Accept suggestion', { field, value })
    setValue(field as keyof PersonInput, value)
    setSuggestions((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleRejectSuggestion = (field: string) => {
    if (DBG) console.debug('[PersonForm] Reject suggestion', { field })
    setSuggestions((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleFormSubmit = async (data: PersonInput) => {
    try {
      await onSubmit(data)
      showToast({
        type: 'success',
        title: initialData ? 'Contact mis à jour' : 'Contact créé',
        message: initialData
          ? 'Le contact a été mis à jour avec succès.'
          : 'Le contact a été ajouté à votre CRM.',
      })
    } catch (err: any) {
      const message =
        err?.detail || err?.message || "Impossible d'enregistrer le contact."
      showToast({
        type: 'error',
        title: 'Erreur',
        message,
      })
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Prénom"
          {...register('first_name', { required: 'Prénom requis' })}
          error={errors.first_name?.message}
          placeholder="Prénom"
        />

        <Input
          label="Nom"
          {...register('last_name', { required: 'Nom requis' })}
          error={errors.last_name?.message}
          placeholder="Nom"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Rôle / Fonction
          </label>
          <HelpTooltip
            content="Poste occupé dans l'organisation : Directeur, Gérant, Responsable commercial, etc. Cette info aide à cibler vos communications selon les décideurs."
            learnMoreLink="/dashboard/help/guides/personnes#roles"
            size="sm"
          />
        </div>
        <Input
          {...register('role')}
          error={errors.role?.message}
          placeholder="ex: Directeur des partenariats"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            label="Email personnel"
            type="email"
            {...register('personal_email')}
            onBlur={handleEmailBlur}
            error={errors.personal_email?.message}
            placeholder="prenom.nom@email.com"
          />
          {suggestions.personal_email && (
            <SuggestionPill
              suggestion={suggestions.personal_email}
              onAccept={() => handleAcceptSuggestion('personal_email', suggestions.personal_email.value)}
              onReject={() => handleRejectSuggestion('personal_email')}
            />
          )}
        </div>

        <div className="space-y-2">
          <Input
            label="Mobile"
            {...register('personal_phone', {
              pattern: {
                value: /^[\+]?[0-9][\s\-\.\(\)0-9]{7,18}$/,
                message: 'Format de téléphone invalide',
              },
            })}
            error={errors.personal_phone?.message}
            placeholder="+33 6 12 34 56 78"
          />
          {suggestions.personal_phone && (
            <SuggestionPill
              suggestion={suggestions.personal_phone}
              onAccept={() => handleAcceptSuggestion('personal_phone', suggestions.personal_phone.value)}
              onReject={() => handleRejectSuggestion('personal_phone')}
            />
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Profil LinkedIn
          </label>
          <HelpTooltip
            content="URL du profil LinkedIn de la personne. Permet de suivre son évolution professionnelle et d'accéder rapidement à son réseau."
            learnMoreLink="/dashboard/help/guides/personnes#linkedin"
            size="sm"
          />
        </div>
        <Input
          {...register('linkedin_url')}
          error={errors.linkedin_url?.message}
          placeholder="https://www.linkedin.com/in/..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Select
            label="Pays"
            {...register('country_code', {
              setValueAs: (value) => (value ? value : undefined),
            })}
            options={COUNTRY_OPTIONS}
          />
          {suggestions.country_code && (
            <SuggestionPill
              suggestion={suggestions.country_code}
              onAccept={() => handleAcceptSuggestion('country_code', suggestions.country_code.value)}
              onReject={() => handleRejectSuggestion('country_code')}
            />
          )}
        </div>
        <div className="space-y-2">
          <Select
            label="Langue préférée"
            {...register('language', {
              setValueAs: (value) => (value ? value : undefined),
            })}
            options={LANGUAGE_OPTIONS}
          />
          {suggestions.language && (
            <SuggestionPill
              suggestion={suggestions.language}
              onAccept={() => handleAcceptSuggestion('language', suggestions.language.value)}
              onReject={() => handleRejectSuggestion('language')}
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          rows={4}
          placeholder="Informations complémentaires, centres d'intérêt, disponibilités..."
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  )
}
