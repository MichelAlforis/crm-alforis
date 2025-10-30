// components/forms/PersonForm.tsx
// ============= PERSON FORM - RÉUTILISABLE =============

'use client'
import { logger } from '@/lib/logger'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Person, PersonInput } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { useAutofillV2, type AutofillSuggestion } from '@/hooks/useAutofillV2'
import { useAutofillPreview, type MatchCandidate } from '@/hooks/useAutofillPreview'
import { SuggestionPill } from '@/components/autofill/SuggestionPill'
import MatchPreviewModal from '@/components/modals/MatchPreviewModal'
import { useContextMenu } from '@/hooks/useContextMenu'
import { FieldContextMenu } from '@/components/ui/FieldContextMenu'

const PERSON_FIELD_MAP: Record<string, keyof PersonInput> = {
  // Emails
  email: 'personal_email',
  personal_email: 'personal_email',
  // Téléphones
  phone: 'personal_phone',
  personal_phone: 'personal_phone',
  mobile: 'personal_phone',
  // Métadonnées
  job_title: 'role',
  role: 'role',
  country: 'country_code',
  country_code: 'country_code',
  language: 'language',
  linkedin_url: 'linkedin_url',
  notes: 'notes',
  first_name: 'first_name',
  last_name: 'last_name',
}

const PERSON_FIELDS_SET = new Set<keyof PersonInput>([
  'first_name',
  'last_name',
  'personal_email',
  'personal_phone',
  'role',
  'linkedin_url',
  'notes',
  'country_code',
  'language',
])

function mapSuggestionField(field: string): keyof PersonInput | null {
  const normalized = PERSON_FIELD_MAP[field]
  if (normalized) return normalized
  return PERSON_FIELDS_SET.has(field as keyof PersonInput) ? (field as keyof PersonInput) : null
}

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
  const { autofill, isLoading: isAutofilling } = useAutofillV2()
  const { preview, isLoading: isPreviewing } = useAutofillPreview()
  const [suggestions, setSuggestions] = useState<Record<string, AutofillSuggestion>>({})
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([])
  const contextMenu = useContextMenu()
  const [contextMenuField, setContextMenuField] = useState<string | null>(null)

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

  // V1.5 Smart Resolver: Preview + Autofill
  const handleEmailBlur = async () => {
    const email = formValues.personal_email
    if (!email || email.length < 5) return

    if (DBG) logger.log('[PersonForm] Triggering smart resolver', { email })

    try {
      // Step 1: Check for duplicate candidates (Preview)
      const previewResult = await preview({
        entity_type: 'person',
        draft: {
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          personal_email: email,
          phone: formValues.phone,
        },
        limit: 5,
      })

      if (DBG) {
        logger.log('[PersonForm] Preview result', {
          recommendation: previewResult.recommendation,
          matches: previewResult.matches.length,
        })
      }

      // Decision based on recommendation
      if (previewResult.recommendation === 'apply' && previewResult.matches.length > 0) {
        // Auto-merge with best match
        const bestMatch = previewResult.matches[0].candidate
        if (DBG) logger.log('[PersonForm] Auto-applying best match', bestMatch)

        Object.entries(bestMatch).forEach(([field, value]) => {
          const targetField = mapSuggestionField(field)
          if (!targetField) return

          if (value && !formValues[targetField]) {
            setValue(targetField, value as PersonInput[typeof targetField])
          }
        })

        showToast({
          type: 'success',
          title: 'Contact trouvé',
          message: 'Les informations ont été enrichies automatiquement.',
        })
      } else if (previewResult.recommendation === 'preview' && previewResult.matches.length > 0) {
        // Show validation modal
        setMatchCandidates(previewResult.matches)
        setShowMatchModal(true)
        return // Stop here, modal will handle the rest
      }

      // Step 2: Run autofill for field suggestions (if no match or create_new)
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
        const targetField = mapSuggestionField(field)
        if (!targetField) return

        if (suggestion.auto_apply) {
          setValue(targetField, suggestion.value as PersonInput[typeof targetField])
          autoApplied.push(targetField)
        }
      })
      if (DBG && autoApplied.length > 0) {
        logger.log('[PersonForm] Auto-applied fields', autoApplied)
      }

      // Store non-auto suggestions for manual review
      const manualSuggestions = Object.entries(result.autofill).reduce(
        (acc, [field, suggestion]) => {
          if (suggestion.auto_apply) return acc

          const targetField = mapSuggestionField(field)
          if (!targetField) return acc

          acc[targetField] = suggestion
          return acc
        },
        {} as Record<string, AutofillSuggestion>
      )

      setSuggestions(manualSuggestions)
      if (DBG && Object.keys(manualSuggestions).length > 0) {
        logger.log('[PersonForm] Manual suggestions', Object.keys(manualSuggestions))
      }
    } catch (err) {
      logger.error('[PersonForm] Smart resolver error:', err)
    }
  }

  // Handle selecting an existing candidate from modal
  const handleSelectCandidate = (candidate: Record<string, any>) => {
    if (DBG) logger.log('[PersonForm] Selected candidate', candidate)

    // Merge candidate data into form
    Object.entries(candidate).forEach(([field, value]) => {
      if (!value || field === 'id' || field === 'created_at' || field === 'updated_at') return

      const targetField = mapSuggestionField(field)
      if (!targetField) return

      setValue(targetField, value as PersonInput[typeof targetField])
    })

    showToast({
      type: 'success',
      title: 'Contact sélectionné',
      message: 'Les informations ont été remplies avec les données existantes.',
    })
  }

  // Handle creating new (continue with autofill)
  const handleCreateNew = async () => {
    if (DBG) logger.log('[PersonForm] User chose to create new')

    // Run regular autofill
    try {
      const result = await autofill({
        entity_type: 'person',
        draft: {
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          personal_email: formValues.personal_email,
        },
        context: {
          budget_mode: 'normal',
          outlook_enabled: true,
        },
      })

      // Auto-apply suggestions
      Object.entries(result.autofill).forEach(([field, suggestion]) => {
        if (!suggestion.auto_apply) return

        const targetField = mapSuggestionField(field)
        if (!targetField) return

        setValue(targetField, suggestion.value as PersonInput[typeof targetField])
      })
    } catch (err) {
      logger.error('[PersonForm] Autofill error:', err)
    }
  }

  const handleAcceptSuggestion = (field: string, value: any) => {
    if (DBG) logger.log('[PersonForm] Accept suggestion', { field, value })
    setValue(field as keyof PersonInput, value)
    setSuggestions((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleRejectSuggestion = (field: string) => {
    if (DBG) logger.log('[PersonForm] Reject suggestion', { field })
    setSuggestions((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Handle context menu open
  const handleFieldContextMenu = (e: React.MouseEvent, fieldName: string) => {
    contextMenu.onContextMenu(e)
    setContextMenuField(fieldName)
  }

  // Handle suggestion selection from context menu
  const handleContextMenuSelect = (value: string) => {
    if (!contextMenuField) return
    if (DBG) logger.log('[PersonForm] Context menu select', { field: contextMenuField, value })
    setValue(contextMenuField as keyof PersonInput, value as any)
    contextMenu.hideMenu()
    setContextMenuField(null)
    showToast({
      type: 'success',
      title: 'Suggestion appliquée',
      message: `Le champ "${contextMenuField}" a été rempli avec la suggestion.`,
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
      {error && <Alert type="error" title="Erreur" message={error} />}

      {/* Bouton Autofill */}
      {!initialData && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Gagnez du temps avec l'autofill intelligent
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Remplissez automatiquement les champs depuis vos emails, patterns existants...
            </p>
          </div>
          <button
            type="button"
            onClick={handleEmailBlur}
            disabled={isAutofilling || isPreviewing || !formValues.first_name || !formValues.last_name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap"
          >
            {(isAutofilling || isPreviewing) ? (
              <>
                <span className="animate-spin">⚡</span>
                <span>Analyse...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Remplir pour moi</span>
              </>
            )}
          </button>
        </div>
      )}

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
        <div onContextMenu={(e) => handleFieldContextMenu(e, 'role')}>
          <Input
            {...register('role')}
            error={errors.role?.message}
            placeholder="ex: Directeur des partenariats"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div onContextMenu={(e) => handleFieldContextMenu(e, 'personal_email')}>
            <Input
              label="Email personnel"
              type="email"
              {...register('personal_email')}
              onBlur={handleEmailBlur}
              error={errors.personal_email?.message}
              placeholder="prenom.nom@email.com"
            />
          </div>
          {suggestions.personal_email && (
            <SuggestionPill
              suggestion={suggestions.personal_email}
              onAccept={() => handleAcceptSuggestion('personal_email', suggestions.personal_email.value)}
              onReject={() => handleRejectSuggestion('personal_email')}
            />
          )}
        </div>

        <div className="space-y-2">
          <div onContextMenu={(e) => handleFieldContextMenu(e, 'personal_phone')}>
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
          </div>
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
        <div onContextMenu={(e) => handleFieldContextMenu(e, 'linkedin_url')}>
          <Input
            {...register('linkedin_url')}
            error={errors.linkedin_url?.message}
            placeholder="https://www.linkedin.com/in/..."
          />
        </div>
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

      {/* Match Preview Modal */}
      <MatchPreviewModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matches={matchCandidates}
        entityType="person"
        onSelectCandidate={handleSelectCandidate}
        onCreateNew={handleCreateNew}
      />

      {/* Context Menu for AI Suggestions */}
      {contextMenu.position && contextMenuField && (
        <FieldContextMenu
          position={contextMenu.position}
          fieldName={contextMenuField}
          onClose={() => {
            contextMenu.hideMenu()
            setContextMenuField(null)
          }}
          onSelect={handleContextMenuSelect}
        />
      )}
    </form>
  )
}
