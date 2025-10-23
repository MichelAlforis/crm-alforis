'use client'

import React, { useState, useEffect } from 'react'
import { Users, Search, Filter, Check } from 'lucide-react'
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

const CATEGORY_OPTIONS = [
  { value: 'BANK', label: 'Banque' },
  { value: 'ASSET_MANAGER', label: 'Asset Manager' },
  { value: 'INSURANCE', label: 'Assurance' },
  { value: 'BROKER', label: 'Courtier' },
  { value: 'FAMILY_OFFICE', label: 'Family Office' },
  { value: 'WEALTH_MANAGER', label: 'Wealth Manager' },
  { value: 'OTHER', label: 'Autre' },
]

export const RecipientSelectorTableV2: React.FC<RecipientSelectorTableProps> = ({
  value,
  onChange,
  onCountChange,
  className,
}) => {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [totalRecipients, setTotalRecipients] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>(value.countries || [])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(value.languages || [])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(value.organisation_categories || [])
  const [selectedIds, setSelectedIds] = useState<number[]>(value.specific_ids || [])
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // Charger les destinataires depuis l'API avec pagination
  useEffect(() => {
    const loadRecipients = async () => {
      setIsLoading(true)
      try {
        const filters = {
          target_type: value.target_type,
          languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
          countries: selectedCountries.length > 0 ? selectedCountries : undefined,
          organisation_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          search: searchText || undefined,
          skip: (page - 1) * pageSize,
          limit: pageSize,
        }

        const response = await apiClient.post<{ recipients: Recipient[]; total: number }>(
          '/email/campaigns/recipients/list',
          filters
        )

        setRecipients(response.data.recipients || [])
        setTotalRecipients(response.data.total || 0)
      } catch (error) {
        console.error('Failed to load recipients:', error)
        setRecipients([])
        setTotalRecipients(0)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipients()
  }, [value.target_type, selectedCountries, selectedLanguages, selectedCategories, searchText, page, pageSize])

  // Mettre à jour le compteur
  useEffect(() => {
    if (onCountChange) {
      onCountChange(selectedIds.length)
    }
  }, [selectedIds.length, onCountChange])

  // Toggle sélection d'un destinataire
  const handleToggleRecipient = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Sélectionner/désélectionner tous sur la page actuelle
  const handleToggleAll = () => {
    const currentPageIds = recipients.map(r => r.id)
    const allSelected = currentPageIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])])
    }
  }

  const handleToggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    )
    setPage(1)
  }

  const handleToggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
    setPage(1)
  }

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
    setPage(1)
  }

  const handleValidateSelection = () => {
    onChange({
      ...value,
      countries: selectedCountries,
      languages: selectedLanguages,
      organisation_categories: selectedCategories,
      specific_ids: selectedIds,
    })
  }

  const handleResetFilters = () => {
    setSelectedCountries([])
    setSelectedLanguages([])
    setSelectedCategories([])
    setSelectedIds([])
    setSearchText('')
    setPage(1)
  }

  const currentPageIds = recipients.map(r => r.id)
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id))

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={allCurrentPageSelected}
          onChange={handleToggleAll}
          className="w-4 h-4"
        />
      ),
      accessor: 'id',
      width: '50px',
      render: (value: any, row: Recipient) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleToggleRecipient(row.id)}
          className="w-4 h-4"
        />
      ),
    },
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
  ]

  const totalPages = Math.ceil(totalRecipients / pageSize)

  return (
    <Card className={className}>
      <CardHeader
        title="Sélection des destinataires"
        subtitle={`${selectedIds.length} destinataire${selectedIds.length > 1 ? 's' : ''} sélectionné${selectedIds.length > 1 ? 's' : ''}`}
        icon={<Users className="h-5 w-5" />}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="h-4 w-4" />}
          >
            {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
          </Button>
        }
      />
      <CardBody className="space-y-spacing-md">
        {/* Filtres */}
        {showFilters && (
          <div className="bg-background-secondary p-4 rounded-radius-md space-y-spacing-md">
            {/* Filtres Pays */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Pays</label>
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

            {/* Filtres Langues */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Langues</label>
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

            {/* Filtres Catégories (si organisations) */}
            {value.target_type === 'organisations' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Catégories
                </label>
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

            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Réinitialiser les filtres
            </Button>
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
        ) : recipients.length === 0 ? (
          <Alert
            type="warning"
            title="Aucun destinataire"
            message="Aucun destinataire ne correspond aux critères sélectionnés. Modifiez vos filtres pour voir plus de résultats."
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={recipients}
              isLoading={isLoading}
              pagination={{
                total: totalRecipients,
                skip: (page - 1) * pageSize,
                limit: pageSize,
                onPageChange: (skip) => setPage(Math.floor(skip / pageSize) + 1),
              }}
            />

            <div className="flex items-center justify-between pt-spacing-md border-t border-border">
              <div className="text-sm text-text-secondary">
                Page {page} sur {totalPages} - {totalRecipients} destinataires au total
              </div>
              <Button
                variant="primary"
                onClick={handleValidateSelection}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Valider la sélection ({selectedIds.length})
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

export default RecipientSelectorTableV2
