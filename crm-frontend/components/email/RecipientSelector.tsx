'use client'

import React, { useEffect, useState } from 'react'
import { Users, Filter, Eye } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'

export type TargetType = 'organisations' | 'contacts'

export interface RecipientFilters {
  target_type: TargetType
  languages?: string[]
  countries?: string[]
  organisation_categories?: string[]
  specific_ids?: number[]
  exclude_ids?: number[]
}

interface RecipientSelectorProps {
  value: RecipientFilters
  onChange: (filters: RecipientFilters) => void
  className?: string
}

interface RecipientCount {
  count: number
}

const TARGET_TYPE_OPTIONS = [
  { value: 'organisations', label: 'Organisations (email principal)' },
  { value: 'contacts', label: 'Contacts Principaux' },
]

const LANGUAGE_OPTIONS = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'English' },
  { value: 'DE', label: 'Deutsch' },
  { value: 'ES', label: 'Español' },
  { value: 'IT', label: 'Italiano' },
]

const CATEGORY_OPTIONS = [
  { value: 'BANK', label: 'Banque' },
  { value: 'ASSET_MANAGER', label: 'Asset Manager' },
  { value: 'INSURANCE', label: 'Assurance' },
  { value: 'BROKER', label: 'Courtier' },
  { value: 'FAMILY_OFFICE', label: 'Family Office' },
  { value: 'WEALTH_MANAGER', label: 'Wealth Manager' },
  { value: 'OTHER', label: 'Autre' },
]

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [isCountLoading, setIsCountLoading] = useState(false)
  const [countries, setCountries] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>(value.countries || [])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(value.languages || [])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(value.organisation_categories || [])

  // Charger la liste des pays disponibles
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await apiClient.get('/api/v1/organisations/countries')
        if (response.data && Array.isArray(response.data)) {
          setCountries(response.data)
        }
      } catch (error) {
        console.error('Failed to load countries:', error)
      }
    }
    loadCountries()
  }, [])

  // Charger le nombre de destinataires
  useEffect(() => {
    const loadCount = async () => {
      setIsCountLoading(true)
      try {
        const response = await apiClient.post<RecipientCount>('/api/v1/email-campaigns/recipients/count', value)
        setRecipientCount(response.data.count)
      } catch (error) {
        console.error('Failed to load recipient count:', error)
        setRecipientCount(null)
      } finally {
        setIsCountLoading(false)
      }
    }

    loadCount()
  }, [value])

  const handleTargetTypeChange = (target_type: TargetType) => {
    onChange({ ...value, target_type })
  }

  const handleLanguageToggle = (lang: string) => {
    const newLanguages = selectedLanguages.includes(lang)
      ? selectedLanguages.filter(l => l !== lang)
      : [...selectedLanguages, lang]

    setSelectedLanguages(newLanguages)
    onChange({ ...value, languages: newLanguages })
  }

  const handleCountryToggle = (country: string) => {
    const newCountries = selectedCountries.includes(country)
      ? selectedCountries.filter(c => c !== country)
      : [...selectedCountries, country]

    setSelectedCountries(newCountries)
    onChange({ ...value, countries: newCountries })
  }

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category]

    setSelectedCategories(newCategories)
    onChange({ ...value, organisation_categories: newCategories })
  }

  return (
    <Card className={className}>
      <CardHeader
        title="Sélection des destinataires"
        subtitle="Définissez qui recevra cette campagne email"
        icon={<Users className="h-5 w-5" />}
      />
      <CardBody className="space-y-spacing-lg">
        {/* Type de destinataires */}
        <div className="space-y-spacing-sm">
          <label className="block text-sm font-medium text-text-primary">
            Type de destinataires *
          </label>
          <Select
            value={value.target_type}
            onChange={(e) => handleTargetTypeChange(e.target.value as TargetType)}
            options={TARGET_TYPE_OPTIONS}
          />
          <p className="text-xs text-text-tertiary">
            {value.target_type === 'organisations'
              ? "Envoi à l'email principal de chaque organisation"
              : "Envoi au contact principal de chaque organisation"}
          </p>
        </div>

        {/* Filtres - Langues (uniquement pour contacts) */}
        {value.target_type === 'contacts' && (
          <div className="space-y-spacing-sm">
            <label className="block text-sm font-medium text-text-primary">
              Langues (optionnel)
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <Button
                  key={lang.value}
                  variant={selectedLanguages.includes(lang.value) ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleLanguageToggle(lang.value)}
                  className="text-xs"
                >
                  {lang.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-text-tertiary">
              {selectedLanguages.length === 0
                ? "Aucun filtre de langue (toutes les langues)"
                : `Filtre actif : ${selectedLanguages.join(', ')}`}
            </p>
          </div>
        )}

        {/* Filtres - Pays */}
        <div className="space-y-spacing-sm">
          <label className="block text-sm font-medium text-text-primary">
            Pays (optionnel)
          </label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-radius-md">
            {countries.length > 0 ? (
              countries.map((country) => (
                <Button
                  key={country}
                  variant={selectedCountries.includes(country) ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleCountryToggle(country)}
                  className="text-xs"
                >
                  {country}
                </Button>
              ))
            ) : (
              <p className="text-xs text-text-tertiary">Chargement des pays...</p>
            )}
          </div>
          <p className="text-xs text-text-tertiary">
            {selectedCountries.length === 0
              ? "Aucun filtre de pays (tous les pays)"
              : `Filtre actif : ${selectedCountries.join(', ')}`}
          </p>
        </div>

        {/* Filtres - Catégories d'organisations */}
        <div className="space-y-spacing-sm">
          <label className="block text-sm font-medium text-text-primary">
            Catégories d'organisations (optionnel)
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategories.includes(cat.value) ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleCategoryToggle(cat.value)}
                className="text-xs"
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary">
            {selectedCategories.length === 0
              ? "Aucun filtre de catégorie (toutes les catégories)"
              : `Filtre actif : ${selectedCategories.join(', ')}`}
          </p>
        </div>

        {/* Compteur de destinataires */}
        <div className="rounded-radius-lg border-2 border-dashed border-border bg-muted/30 p-spacing-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">Destinataires trouvés</p>
                {isCountLoading ? (
                  <p className="text-2xl font-bold text-text-tertiary">Chargement...</p>
                ) : recipientCount !== null ? (
                  <p className="text-3xl font-bold text-primary">{recipientCount.toLocaleString()}</p>
                ) : (
                  <p className="text-2xl font-bold text-text-tertiary">-</p>
                )}
              </div>
            </div>
          </div>

          {recipientCount === 0 && !isCountLoading && (
            <Alert
              type="warning"
              message="Aucun destinataire ne correspond à ces filtres. Essayez d'élargir vos critères de sélection."
              className="mt-spacing-md"
            />
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export default RecipientSelector
