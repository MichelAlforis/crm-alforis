'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardBody, Button, Alert } from '@/components/shared'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { useMailingLists } from '@/hooks/useMailingLists'
import { RecipientSelectorTableV2 as RecipientSelectorTable, type RecipientFilters } from '@/components/email/RecipientSelectorTableV2'

export default function NewMailingListPage() {
  const router = useRouter()
  const { createList, isCreating } = useMailingLists()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_type: 'contacts' as 'contacts' | 'organisations',
  })

  const [recipientFilters, setRecipientFilters] = useState<RecipientFilters>({
    target_type: 'contacts',
    languages: [],
    countries: [],
    organisation_categories: [],
    specific_ids: [],
    exclude_ids: [],
  })

  const [recipientCount, setRecipientCount] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showFiltersSection, setShowFiltersSection] = useState(true)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la liste est obligatoire'
    }

    if (recipientCount === 0) {
      newErrors.recipients = 'Veuillez sélectionner au moins un destinataire'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      const filters = {
        languages: recipientFilters.languages,
        countries: recipientFilters.countries,
        organisation_categories: recipientFilters.organisation_categories,
        organisation_types: recipientFilters.organisation_types,
        cities: recipientFilters.cities,
        roles: recipientFilters.roles,
        is_active: recipientFilters.is_active,
        specific_ids: recipientFilters.specific_ids,
        exclude_ids: recipientFilters.exclude_ids,
      }

      await createList({
        ...formData,
        filters,
        recipient_count: recipientCount,
      })

      router.push('/dashboard/marketing/mailing-lists')
    } catch (error: any) {
      setErrors({ global: error?.message || 'Erreur lors de la création de la liste' })
    }
  }

  return (
    <div className="space-y-spacing-lg p-spacing-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/marketing/mailing-lists">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Nouvelle liste de diffusion
            </h1>
            <p className="text-text-secondary mt-1">
              Créez votre liste en 3 étapes simples
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={isCreating || !formData.name.trim() || recipientCount === 0}
        >
          <Save className="w-5 h-5 mr-2" />
          {isCreating ? 'Création...' : 'Créer la liste'}
        </Button>
      </div>

      {/* Erreur globale */}
      {errors.global && (
        <Alert type="error" message={errors.global} onClose={() => setErrors({ ...errors, global: '' })} />
      )}

      {/* Étape 1: Informations de base */}
      <Card>
        <CardHeader
          title="1. Informations de base"
          subtitle="Nommez et décrivez votre liste"
        />
        <CardBody className="space-y-spacing-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-md">
            <div>
              <Input
                label="Nom de la liste *"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: '' })
                }}
                placeholder="Ex: Clients France, Prospects Q1 2025"
                required
                error={errors.name}
              />
            </div>

            <div>
              <Select
                label="Type de destinataires *"
                value={formData.target_type}
                onChange={(e) => {
                  const newType = e.target.value as 'contacts' | 'organisations'
                  setFormData({ ...formData, target_type: newType })
                  setRecipientFilters({
                    ...recipientFilters,
                    target_type: newType,
                    // Reset filters when changing type
                    languages: [],
                    countries: [],
                    organisation_categories: [],
                    organisation_types: [],
                    cities: [],
                    roles: [],
                    specific_ids: [],
                  })
                }}
                required
              >
                <option value="contacts">👤 Contacts (Personnes)</option>
                <option value="organisations">🏢 Organisations</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'usage de cette liste (objectif, contexte, etc.)"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
            />
          </div>
        </CardBody>
      </Card>

      {/* Étape 2: Filtres et sélection */}
      <Card>
        <CardHeader
          title="2. Sélection des destinataires"
          subtitle={`${recipientCount} destinataire${recipientCount > 1 ? 's' : ''} sélectionné${recipientCount > 1 ? 's' : ''}`}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltersSection(!showFiltersSection)}
            >
              {showFiltersSection ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Masquer
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Afficher
                </>
              )}
            </Button>
          }
        />
        {showFiltersSection && (
          <CardBody>
            {errors.recipients && (
              <Alert type="error" message={errors.recipients} className="mb-4" />
            )}

            <RecipientSelectorTable
              value={recipientFilters}
              onChange={(newFilters) => {
                setRecipientFilters(newFilters)
                if (errors.recipients && newFilters.specific_ids && newFilters.specific_ids.length > 0) {
                  setErrors({ ...errors, recipients: '' })
                }
              }}
              onCountChange={setRecipientCount}
            />
          </CardBody>
        )}
      </Card>

      {/* Étape 3: Résumé */}
      <Card>
        <CardHeader
          title="3. Résumé"
          subtitle="Vérifiez les informations avant de créer la liste"
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
            <div className="bg-background-secondary p-4 rounded-radius-md">
              <p className="text-sm text-text-tertiary mb-1">Nom de la liste</p>
              <p className="font-semibold text-text-primary">
                {formData.name || '(non défini)'}
              </p>
            </div>

            <div className="bg-background-secondary p-4 rounded-radius-md">
              <p className="text-sm text-text-tertiary mb-1">Type</p>
              <p className="font-semibold text-text-primary">
                {formData.target_type === 'contacts' ? '👤 Contacts' : '🏢 Organisations'}
              </p>
            </div>

            <div className="bg-primary/10 p-4 rounded-radius-md border-2 border-primary">
              <p className="text-sm text-primary mb-1">Destinataires sélectionnés</p>
              <p className="text-2xl font-bold text-primary">
                {recipientCount}
              </p>
            </div>
          </div>

          {formData.description && (
            <div className="mt-4 bg-background-secondary p-4 rounded-radius-md">
              <p className="text-sm text-text-tertiary mb-1">Description</p>
              <p className="text-sm text-text-primary">{formData.description}</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
