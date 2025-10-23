'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Users, Search, Filter, Check, X, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Table } from '@/components/shared/Table'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

export type TargetType = 'organisations' | 'contacts'

export interface RecipientFilters {
  target_type: TargetType
  languages?: string[]
  countries?: string[]
  organisation_categories?: string[]
  specific_ids?: number[]
  exclude_ids?: number[]
}

interface RecipientSelectorTableProps {
  value: RecipientFilters
  onChange: (filters: RecipientFilters) => void
  onCountChange?: (count: number) => void
  className?: string
}

interface Recipient {
  id: number
  name: string
  email: string
  organisation_name?: string
  country?: string
  language?: string
  category?: string
}

const TARGET_TYPE_OPTIONS = [
  { value: 'organisations', label: 'Organisations' },
  { value: 'contacts', label: 'Contacts Principaux' },
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

export const RecipientSelectorTable: React.FC<RecipientSelectorTableProps> = ({
  value,
  onChange,
  onCountChange,
  className,
}) => {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>(value.countries || [])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(value.languages || [])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(value.organisation_categories || [])
  const [excludedIds, setExcludedIds] = useState<number[]>(value.exclude_ids || [])
  const [showFilters, setShowFilters] = useState(false)

  // Charger les destinataires depuis l'API
  useEffect(() => {
    const loadRecipients = async () => {
      setIsLoading(true)
      try {
        const filters = {
          target_type: value.target_type,
          languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
          countries: selectedCountries.length > 0 ? selectedCountries : undefined,
          organisation_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        }

        const response = await apiClient.post<{ recipients: Recipient[]; total: number }>(
          '/email/campaigns/recipients/list',
          filters
        )

        console.log('📊 Recipients loaded:', response.data)
        setRecipients(response.data.recipients || [])
      } catch (error) {
        console.error('Failed to load recipients:', error)
        setRecipients([])
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipients()
  }, [value.target_type, selectedCountries, selectedLanguages, selectedCategories])

  // Filtrer localement par recherche texte
  const filteredRecipients = useMemo(() => {
    let filtered = recipients

    // Exclure les IDs retirés
    filtered = filtered.filter(r => !excludedIds.includes(r.id))

    // Recherche texte
    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(
        r =>
          r.name.toLowerCase().includes(search) ||
          r.email.toLowerCase().includes(search) ||
          r.organisation_name?.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [recipients, excludedIds, searchText])

  // Mettre à jour le parent avec le nombre de destinataires
  useEffect(() => {
    if (onCountChange) {
      onCountChange(filteredRecipients.length)
    }
  }, [filteredRecipients.length, onCountChange])

  // Note: La synchronisation se fait via le bouton "Valider la sélection"
  // pour éviter les boucles infinies de re-render

  const handleRemoveRecipient = (id: number) => {
    setExcludedIds(prev => [...prev, id])
  }

  const handleToggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    )
  }

  const handleToggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  const handleValidateSelection = () => {
    onChange({
      ...value,
      countries: selectedCountries,
      languages: selectedLanguages,
      organisation_categories: selectedCategories,
      exclude_ids: excludedIds,
    })
  }

  const handleResetFilters = () => {
    setSelectedCountries([])
    setSelectedLanguages([])
    setSelectedCategories([])
    setExcludedIds([])
    setSearchText('')
  }

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
      sortable: true,
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
    },
    ...(value.target_type === 'contacts'
      ? [
          {
            header: 'Organisation',
            accessor: 'organisation_name',
            sortable: true,
          },
        ]
      : []),
    {
      header: 'Pays',
      accessor: 'country',
      sortable: true,
      render: (value: any, row: Recipient) => {
        if (!row) return '-'
        const country = COUNTRY_OPTIONS.find(c => c.code === row.country)
        return country ? `${country.flag} ${country.name}` : row.country || '-'
      },
    },
    {
      header: 'Langue',
      accessor: 'language',
      sortable: true,
      render: (value: any, row: Recipient) => {
        if (!row) return '-'
        const lang = LANGUAGE_OPTIONS.find(l => l.code === row.language)
        return lang ? `${lang.flag} ${lang.name}` : row.language || '-'
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: any, row: Recipient) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveRecipient(row.id)}
          leftIcon={<Trash2 className="h-4 w-4" />}
          className="text-danger hover:bg-danger/10"
        >
          Retirer
        </Button>
      ),
    },
  ]

  return (
    <Card className={className}>
      <CardHeader
        title="Sélection des destinataires"
        subtitle="Définissez qui recevra cette campagne email"
        icon={<Users className="h-5 w-5" />}
        action={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">
              {filteredRecipients.length} destinataire{filteredRecipients.length > 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
            </Button>
          </div>
        }
      />
      <CardBody className="space-y-spacing-md">
        {/* Type de destinataires */}
        <div className="space-y-spacing-sm">
          <label className="block text-sm font-medium text-text-primary">
            Type de destinataires *
          </label>
          <div className="flex gap-2">
            {TARGET_TYPE_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={value.target_type === option.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onChange({ ...value, target_type: option.value as TargetType })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtres rapides */}
        {showFilters && (
          <div className="space-y-spacing-md border border-border rounded-radius-md p-spacing-md bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Filtres rapides</h3>
              <Button variant="ghost" size="xs" onClick={handleResetFilters}>
                Réinitialiser
              </Button>
            </div>

            {/* Langues */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Langues</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <Button
                    key={lang.code}
                    variant={selectedLanguages.includes(lang.code) ? 'primary' : 'ghost'}
                    size="xs"
                    onClick={() => handleToggleLanguage(lang.code)}
                    className="border border-border"
                  >
                    {lang.flag} {lang.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Pays */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Pays</label>
              <div className="flex flex-wrap gap-2">
                {COUNTRY_OPTIONS.map(country => (
                  <Button
                    key={country.code}
                    variant={selectedCountries.includes(country.code) ? 'primary' : 'ghost'}
                    size="xs"
                    onClick={() => handleToggleCountry(country.code)}
                    className="border border-border"
                  >
                    {country.flag} {country.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Catégories (seulement pour organisations) */}
            {value.target_type === 'organisations' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary">Catégories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(cat => (
                    <Button
                      key={cat.value}
                      variant={selectedCategories.includes(cat.value) ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => handleToggleCategory(cat.value)}
                      className="border border-border"
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Rechercher par nom, email, organisation..."
            className="pl-10"
          />
        </div>

        {/* Tableau des destinataires */}
        {isLoading ? (
          <Alert type="info" message="Chargement des destinataires..." />
        ) : filteredRecipients.length === 0 ? (
          <Alert
            type="warning"
            title="Aucun destinataire"
            message="Aucun destinataire ne correspond aux critères sélectionnés. Modifiez vos filtres pour voir plus de résultats."
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={filteredRecipients}
              onRowClick={() => {}}
              isLoading={isLoading}
            />

            <div className="flex items-center justify-between pt-spacing-md border-t border-border">
              <div className="text-sm text-text-secondary">
                {excludedIds.length > 0 && (
                  <span className="text-warning">
                    {excludedIds.length} destinataire{excludedIds.length > 1 ? 's' : ''} exclu
                    {excludedIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleValidateSelection}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Valider la sélection ({filteredRecipients.length} destinataires)
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

export default RecipientSelectorTable
