'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Users, Search, Filter, Download, Upload } from 'lucide-react'
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
  organisation_types?: string[]  // INVESTOR, CLIENT, FOURNISSEUR
  cities?: string[]  // Villes
  roles?: string[]  // Fonction/rôle des personnes
  is_active?: boolean  // Statut actif/inactif
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
  { value: 'INSTITUTION', label: 'Institution' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'SDG', label: 'SDG' },
  { value: 'CGPI', label: 'CGPI' },
  { value: 'CORPORATION', label: 'Corporation' },
]

const TYPE_OPTIONS = [
  { value: 'INVESTOR', label: 'Investisseur' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'FOURNISSEUR', label: 'Fournisseur' },
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>(value.organisation_types || [])
  const [selectedCities, setSelectedCities] = useState<string[]>(value.cities || [])
  const [selectedRoles, setSelectedRoles] = useState<string[]>(value.roles || [])
  const [filterIsActive, setFilterIsActive] = useState<boolean | undefined>(value.is_active)
  const [selectedIds, setSelectedIds] = useState<number[]>(value.specific_ids || [])
  const [showFilters, setShowFilters] = useState(false)
  const [skip, setSkip] = useState(0)
  const [limit] = useState(20)

  // Champs de saisie pour villes et rôles
  const [cityInput, setCityInput] = useState('')
  const [roleInput, setRoleInput] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Import des destinataires depuis un fichier
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError(null)

    try {
      // Lire le fichier
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      // Parser les IDs (format: une ligne = un ID, ou CSV avec colonne "id")
      const ids: number[] = []

      if (lines[0].toLowerCase().includes('id') || lines[0].includes(',')) {
        // Format CSV avec header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        const idIndex = headers.findIndex(h => h === 'id')

        if (idIndex === -1) {
          throw new Error('Colonne "id" introuvable dans le fichier CSV')
        }

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',')
          const id = parseInt(values[idIndex]?.trim())
          if (!isNaN(id)) ids.push(id)
        }
      } else {
        // Format simple: un ID par ligne
        for (const line of lines) {
          const id = parseInt(line.trim())
          if (!isNaN(id)) ids.push(id)
        }
      }

      if (ids.length === 0) {
        throw new Error('Aucun ID valide trouvé dans le fichier')
      }

      // Ajouter les IDs importés à la sélection
      setSelectedIds(prev => [...new Set([...prev, ...ids])])

      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportError(error instanceof Error ? error.message : 'Erreur lors de l\'import')
    } finally {
      setIsImporting(false)
    }
  }

  // Export des destinataires sélectionnés
  const handleExport = async (format: 'csv' | 'excel') => {
    if (selectedIds.length === 0) return

    setIsExporting(true)
    try {
      const endpoint = `/exports/recipients/${format}`
      const url = apiClient.resolveUrl(endpoint, {
        ids: selectedIds.join(','),
        target_type: value.target_type,
      })

      // Télécharger le fichier
      const link = document.createElement('a')
      link.href = url
      link.download = `destinataires-selection-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

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
          organisation_types: selectedTypes.length > 0 ? selectedTypes : undefined,
          cities: selectedCities.length > 0 ? selectedCities : undefined,
          roles: selectedRoles.length > 0 ? selectedRoles : undefined,
          is_active: filterIsActive,
          search: searchText || undefined,
        }

        // Envoyer skip et limit comme query params
        const response = await apiClient.post<{ recipients: Recipient[]; total: number }>(
          `/email/campaigns/recipients/list?skip=${skip}&limit=${limit}`,
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
  }, [value.target_type, selectedCountries, selectedLanguages, selectedCategories, selectedTypes, selectedCities, selectedRoles, filterIsActive, searchText, skip, limit])

  // Mettre à jour le compteur
  useEffect(() => {
    if (onCountChange) {
      onCountChange(selectedIds.length)
    }
  }, [selectedIds.length, onCountChange])

  // Synchroniser automatiquement les filtres et sélections avec le parent
  useEffect(() => {
    onChange({
      ...value,
      countries: selectedCountries,
      languages: selectedLanguages,
      organisation_categories: selectedCategories,
      organisation_types: selectedTypes,
      cities: selectedCities,
      roles: selectedRoles,
      is_active: filterIsActive,
      specific_ids: selectedIds,
    })
  }, [selectedCountries, selectedLanguages, selectedCategories, selectedTypes, selectedCities, selectedRoles, filterIsActive, selectedIds])

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

  // Sélectionner TOUS les résultats filtrés (toutes les pages)
  const handleSelectAllFiltered = async () => {
    try {
      const filters = {
        target_type: value.target_type,
        languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : undefined,
        organisation_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        organisation_types: selectedTypes.length > 0 ? selectedTypes : undefined,
        cities: selectedCities.length > 0 ? selectedCities : undefined,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        is_active: filterIsActive,
        search: searchText || undefined,
      }

      // Récupérer TOUS les IDs (sans pagination)
      const response = await apiClient.post<{ recipients: { id: number }[]; total: number }>(
        `/email/campaigns/recipients/list?skip=0&limit=10000`,
        filters
      )

      const allIds = response.data.recipients.map(r => r.id)
      setSelectedIds(allIds)
    } catch (error) {
      console.error('Failed to select all filtered recipients:', error)
    }
  }

  const handleToggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    )
    setSkip(0)
  }

  const handleToggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
    setSkip(0)
  }

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
    setSkip(0)
  }

  const handleToggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
    setSkip(0)
  }

  const handleToggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
    setSkip(0)
  }

  const handleToggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
    setSkip(0)
  }

  const handleAddCity = () => {
    if (cityInput.trim() && !selectedCities.includes(cityInput.trim())) {
      setSelectedCities(prev => [...prev, cityInput.trim()])
      setCityInput('')
      setSkip(0)
    }
  }

  const handleAddRole = () => {
    if (roleInput.trim() && !selectedRoles.includes(roleInput.trim())) {
      setSelectedRoles(prev => [...prev, roleInput.trim()])
      setRoleInput('')
      setSkip(0)
    }
  }

  const handleResetFilters = () => {
    setSelectedCountries([])
    setSelectedLanguages([])
    setSelectedCategories([])
    setSelectedTypes([])
    setSelectedCities([])
    setSelectedRoles([])
    setFilterIsActive(undefined)
    setSelectedIds([])
    setSearchText('')
    setSkip(0)
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

  const totalPages = Math.ceil(totalRecipients / limit)
  const currentPage = Math.floor(skip / limit) + 1

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
              <>
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

                {/* Filtres Types */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Types d'organisations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map(type => (
                      <Button
                        key={type.value}
                        variant={selectedTypes.includes(type.value) ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => handleToggleType(type.value)}
                        className="border border-border"
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Filtre Statut Actif */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Statut
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterIsActive === undefined ? 'primary' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterIsActive(undefined)}
                  className="border border-border"
                >
                  Tous
                </Button>
                <Button
                  variant={filterIsActive === true ? 'primary' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterIsActive(true)}
                  className="border border-border"
                >
                  Actifs uniquement
                </Button>
                <Button
                  variant={filterIsActive === false ? 'primary' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterIsActive(false)}
                  className="border border-border"
                >
                  Inactifs uniquement
                </Button>
              </div>
            </div>

            {/* Filtres Villes (si organisations) */}
            {value.target_type === 'organisations' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Villes
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ajouter une ville..."
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={handleAddCity}>
                      Ajouter
                    </Button>
                  </div>
                  {selectedCities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCities.map(city => (
                        <Button
                          key={city}
                          variant="primary"
                          size="xs"
                          onClick={() => handleToggleCity(city)}
                          className="border border-border"
                        >
                          {city} ×
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filtres Rôles/Fonctions (si contacts) */}
            {value.target_type === 'contacts' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Rôles / Fonctions
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ajouter un rôle ou fonction..."
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={handleAddRole}>
                      Ajouter
                    </Button>
                  </div>
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedRoles.map(role => (
                        <Button
                          key={role}
                          variant="primary"
                          size="xs"
                          onClick={() => handleToggleRole(role)}
                          className="border border-border"
                        >
                          {role} ×
                        </Button>
                      ))}
                    </div>
                  )}
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

        {/* Info sur l'import */}
        <Alert
          type="info"
          message="💡 Astuce: Importez un fichier .txt (un ID par ligne) ou .csv (avec colonne 'id') pour ajouter des destinataires rapidement"
        />

        {/* Actions de sélection */}
        {totalRecipients > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-background-secondary p-3 rounded-radius-md">
              <div className="text-sm text-text-secondary">
                {selectedIds.length} / {totalRecipients} destinataire{totalRecipients > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  disabled={isLoading}
                >
                  Tout sélectionner ({totalRecipients})
                </Button>
                {selectedIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                  >
                    Tout désélectionner
                  </Button>
                )}
              </div>
            </div>

            {/* Import/Export */}
            <div className="flex items-center justify-between gap-2 bg-background-secondary/50 p-3 rounded-radius-md border border-border">
              {/* Import */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  Importer des IDs:
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleImport}
                  disabled={isImporting}
                  className="hidden"
                  id="import-recipients"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  {isImporting ? 'Import...' : 'Importer'}
                </Button>
                {importError && (
                  <span className="text-xs text-error">{importError}</span>
                )}
              </div>

              {/* Export */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    Exporter ({selectedIds.length}):
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('excel')}
                    disabled={isExporting}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Excel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

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
                skip,
                limit,
                onPageChange: (newSkip) => setSkip(newSkip),
              }}
            />

            <div className="pt-spacing-md border-t border-border">
              <div className="text-sm text-text-secondary text-center">
                Page {currentPage} sur {totalPages} - {totalRecipients} destinataires au total
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
