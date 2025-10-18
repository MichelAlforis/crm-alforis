'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Target, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import type { EmailAudienceSnapshot, EmailRecipient } from '@/lib/types'

const PIPELINE_STAGES = [
  { value: 'prospect_froid', label: 'Prospect froid' },
  { value: 'prospect_tiede', label: 'Prospect tiède' },
  { value: 'prospect_chaud', label: 'Prospect chaud' },
  { value: 'en_negociation', label: 'En négociation' },
  { value: 'client', label: 'Clients actifs' },
]

const ORGANISATION_CATEGORIES = [
  { value: 'DISTRIBUTEUR', label: 'Distributeurs' },
  { value: 'EMETTEUR', label: 'Émetteurs' },
  { value: 'FOURNISSEUR_SERVICE', label: 'Prestataires' },
  { value: 'PARTENAIRE', label: 'Partenaires' },
  { value: 'AUTRE', label: 'Autres' },
]

const CONTACT_ROLES = [
  { value: 'direction', label: 'Direction' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ops', label: 'Opérations' },
  { value: 'autre', label: 'Autres' },
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
]

const TAGS = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'mandat', label: 'Mandat signé' },
  { value: 'evenement', label: 'Participation événement' },
  { value: 'top', label: 'Top comptes' },
]

export interface AudienceFiltersPayload {
  organisations: {
    categories: string[]
    pipeline_stages: string[]
    languages: string[]
  }
  contacts: {
    tags: string[]
    roles: string[]
    newsletter_opt_in: boolean
    last_interaction_days?: number | null
  }
  custom: {
    manual_emails: string[]
  }
}

export interface AudienceSelectorState {
  filters: AudienceFiltersPayload
  manualInput: string
}

interface AudienceSelectorProps {
  value?: AudienceSelectorState
  previewRecipients?: EmailRecipient[]
  summary?: EmailAudienceSnapshot
  isGenerating?: boolean
  onChange?: (state: AudienceSelectorState) => void
  onGeneratePreview?: (state: AudienceSelectorState) => Promise<void> | void
  className?: string
}

const defaultState: AudienceSelectorState = {
  filters: {
    organisations: {
      categories: [],
      pipeline_stages: [],
      languages: [],
    },
    contacts: {
      tags: [],
      roles: [],
      newsletter_opt_in: true,
      last_interaction_days: undefined,
    },
    custom: {
      manual_emails: [],
    },
  },
  manualInput: '',
}

const parseEmails = (input: string): string[] => {
  const rawItems = input
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return Array.from(
    new Set(rawItems.filter((item) => emailRegex.test(item)))
  )
}

export const AudienceSelector: React.FC<AudienceSelectorProps> = ({
  value,
  previewRecipients = [],
  summary,
  isGenerating = false,
  onChange,
  onGeneratePreview,
  className,
}) => {
  const [state, setState] = useState<AudienceSelectorState>(value ?? defaultState)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (value) {
      setState(value)
    }
  }, [value])

  const updateState = useCallback(
    (next: Partial<AudienceSelectorState>) => {
      setState((prev) => {
        const merged: AudienceSelectorState = {
          ...prev,
          ...next,
          filters: {
            ...prev.filters,
            ...(next.filters ?? {}),
            organisations: {
              ...prev.filters.organisations,
              ...(next.filters?.organisations ?? {}),
            },
            contacts: {
              ...prev.filters.contacts,
              ...(next.filters?.contacts ?? {}),
            },
            custom: {
              ...prev.filters.custom,
              ...(next.filters?.custom ?? {}),
            },
          },
        }
        onChange?.(merged)
        return merged
      })
    },
    [onChange]
  )

  const effectiveManualEmails = useMemo(
    () => parseEmails(state.manualInput),
    [state.manualInput]
  )

  useEffect(() => {
    updateState({
      filters: {
        ...state.filters,
        custom: {
          ...state.filters.custom,
          manual_emails: effectiveManualEmails,
        },
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveManualEmails.length])

  useEffect(() => {
    if (state.filters.organisations.pipeline_stages.length === 0) {
      setWarning("Aucun pipeline sélectionné : l'audience inclura tous les prospects et clients.")
    } else if (state.filters.contacts.newsletter_opt_in === false) {
      setWarning("Vous avez choisi d'inclure des contacts sans opt-in. Vérifiez la conformité RGPD.")
    } else {
      setWarning(null)
    }
  }, [state.filters.contacts.newsletter_opt_in, state.filters.organisations.pipeline_stages.length])

  const previewColumns = useMemo(() => {
    const showVariant = previewRecipients.some((recipient) => recipient.custom_data?.variant || recipient.organisation_name)
    return { showVariant }
  }, [previewRecipients])

  return (
    <Card className={className}>
      <CardHeader
        title="Segmentation & Audience"
        subtitle="Définissez précisément quels contacts recevront la campagne grâce aux filtres dynamiques et import manuel."
      />
      <CardBody className="space-y-spacing-lg">
        {warning && (
          <Alert
            type="warning"
            title="Attention"
            message={warning}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        )}

        <section className="space-y-spacing-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <Target className="h-4 w-4 text-primary" />
            Filtres organisations
          </div>
          <div className="grid gap-spacing-md md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Pipeline ciblé
              </label>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STAGES.map((stage) => {
                  const active = state.filters.organisations.pipeline_stages.includes(stage.value)
                  return (
                    <Button
                      key={stage.value}
                      variant={active ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() =>
                        updateState({
                          filters: {
                            organisations: {
                              pipeline_stages: active
                                ? state.filters.organisations.pipeline_stages.filter((value) => value !== stage.value)
                                : [...state.filters.organisations.pipeline_stages, stage.value],
                            },
                          },
                        })
                      }
                    >
                      {stage.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Catégories d'organisation
              </label>
              <div className="flex flex-wrap gap-2">
                {ORGANISATION_CATEGORIES.map((category) => {
                  const active = state.filters.organisations.categories.includes(category.value)
                  return (
                    <Button
                      key={category.value}
                      variant={active ? 'secondary' : 'ghost'}
                      size="xs"
                      onClick={() =>
                        updateState({
                          filters: {
                            organisations: {
                              categories: active
                                ? state.filters.organisations.categories.filter((value) => value !== category.value)
                                : [...state.filters.organisations.categories, category.value],
                            },
                          },
                        })
                      }
                    >
                      {category.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-spacing-md md:grid-cols-2">
            <div>
              <Select
                label="Langue principale"
                value={state.filters.organisations.languages[0] ?? ''}
                onChange={(event) =>
                  updateState({
                    filters: {
                      organisations: {
                        languages: event.target.value ? [event.target.value] : [],
                      },
                    },
                  })
                }
              >
                <option value="">Toutes les langues</option>
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Input
                type="number"
                min={0}
                label="Interaction récente (jours)"
                placeholder="Ex: 90"
                value={state.filters.contacts.last_interaction_days ?? ''}
                onChange={(event) =>
                  updateState({
                    filters: {
                      contacts: {
                        last_interaction_days: event.target.value ? Number(event.target.value) : undefined,
                      },
                    },
                  })
                }
                helperText="Filtre les contacts ayant eu une interaction dans les X derniers jours."
              />
            </div>
          </div>
        </section>

        <section className="space-y-spacing-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <Users className="h-4 w-4 text-primary" />
            Filtres contacts
          </div>

          <div className="grid gap-spacing-md md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Tags comportementaux
              </label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => {
                  const active = state.filters.contacts.tags.includes(tag.value)
                  return (
                    <Button
                      key={tag.value}
                      variant={active ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() =>
                        updateState({
                          filters: {
                            contacts: {
                              tags: active
                                ? state.filters.contacts.tags.filter((value) => value !== tag.value)
                                : [...state.filters.contacts.tags, tag.value],
                            },
                          },
                        })
                      }
                    >
                      #{tag.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Fonctions ciblées
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_ROLES.map((role) => {
                  const active = state.filters.contacts.roles.includes(role.value)
                  return (
                    <Button
                      key={role.value}
                      variant={active ? 'secondary' : 'ghost'}
                      size="xs"
                      onClick={() =>
                        updateState({
                          filters: {
                            contacts: {
                              roles: active
                                ? state.filters.contacts.roles.filter((value) => value !== role.value)
                                : [...state.filters.contacts.roles, role.value],
                            },
                          },
                        })
                      }
                    >
                      {role.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={state.filters.contacts.newsletter_opt_in}
              onChange={(event) =>
                updateState({
                  filters: {
                    contacts: {
                      newsletter_opt_in: event.target.checked,
                    },
                  },
                })
              }
            />
            Limiter aux contacts opt-in (recommandé RGPD)
          </label>
        </section>

        <section className="space-y-spacing-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Emails manuels supplémentaires
          </div>
          <textarea
            className="w-full min-h-[120px] rounded-radius-md border border-border bg-muted/40 p-spacing-md text-sm text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Collez ou saisissez des emails supplémentaires (séparés par des virgules ou retours à la ligne)…"
            value={state.manualInput}
            onChange={(event) =>
              updateState({
                manualInput: event.target.value,
              })
            }
          />
          <p className="text-xs text-text-tertiary">
            {effectiveManualEmails.length} email(s) valides détectés · Les doublons seront automatiquement supprimés.
          </p>
        </section>

        <section className="space-y-spacing-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Aperçu audience</h4>
              <p className="text-xs text-text-secondary">
                Calculez l'audience pour visualiser le volume et échantillonner les destinataires.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => onGeneratePreview?.(state)}
              isLoading={isGenerating}
            >
              Calculer l'audience
            </Button>
          </div>

          {summary && (
            <div className="grid gap-spacing-md sm:grid-cols-3">
              <div className="rounded-radius-md border border-border bg-foreground p-spacing-md text-center">
                <div className="text-2xl font-semibold text-text-primary">
                  {summary.total_contacts.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs uppercase tracking-wide text-text-tertiary">Contacts</div>
              </div>
              <div className="rounded-radius-md border border-border bg-foreground p-spacing-md text-center">
                <div className="text-2xl font-semibold text-text-primary">
                  {summary.total_organisations.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs uppercase tracking-wide text-text-tertiary">Organisations</div>
              </div>
              <div className="rounded-radius-md border border-border bg-foreground p-spacing-md text-center">
                <div className="text-2xl font-semibold text-text-primary">
                  {effectiveManualEmails.length.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs uppercase tracking-wide text-text-tertiary">Emails ajoutés</div>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calcul de l'audience en cours…
            </div>
          )}

          {!isGenerating && previewRecipients.length > 0 && (
            <div className="overflow-hidden rounded-radius-md border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-text-tertiary">
                  <tr>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">Organisation</th>
                    {previewColumns.showVariant && <th className="px-4 py-2 text-left">Variant</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-foreground">
                  {previewRecipients.slice(0, 12).map((recipient) => (
                    <tr key={`${recipient.email}-${recipient.person_id ?? recipient.organisation_id ?? ''}`}>
                      <td className="px-4 py-2 font-medium text-text-primary">{recipient.email}</td>
                      <td className="px-4 py-2 text-text-secondary">
                        {recipient.full_name ??
                          [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') ||
                          '—'}
                      </td>
                      <td className="px-4 py-2 text-text-secondary">
                        {recipient.organisation_name ?? '—'}
                      </td>
                      {previewColumns.showVariant && (
                        <td className="px-4 py-2 text-text-secondary">
                          {recipient.custom_data?.variant ?? '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRecipients.length > 12 && (
                <div className="border-t border-border bg-muted/40 px-4 py-3 text-xs text-text-tertiary">
                  + {previewRecipients.length - 12} autres destinataires…
                </div>
              )}
            </div>
          )}

          {!isGenerating && previewRecipients.length === 0 && (
            <Alert
              type="info"
              message="Calculez l'audience pour obtenir un aperçu des destinataires et valider la segmentation."
            />
          )}
        </section>
      </CardBody>
    </Card>
  )
}

export default AudienceSelector
