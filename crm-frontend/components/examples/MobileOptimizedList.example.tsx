/**
 * Exemple : Liste optimisée mobile
 *
 * Montre comment implémenter une liste qui s'adapte automatiquement :
 * - Desktop : Tableau classique
 * - Mobile : Cartes touch-friendly
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, Plus } from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import MobileCard from '@/components/mobile/MobileCard'
import BottomSheet from '@/components/mobile/BottomSheet'
import { Badge, Button, Table } from '@/components/shared'

// Types d'exemple
interface Organisation {
  id: string
  name: string
  category: string
  country: string
  status: 'active' | 'inactive'
  aum: number
}

const MOCK_DATA: Organisation[] = [
  {
    id: '1',
    name: 'Allianz Global Investors',
    category: 'Institution',
    country: '🇫🇷 France',
    status: 'active',
    aum: 2500000000,
  },
  {
    id: '2',
    name: 'BNP Paribas Asset Management',
    category: 'Institution',
    country: '🇫🇷 France',
    status: 'active',
    aum: 4800000000,
  },
  {
    id: '3',
    name: 'Amundi',
    category: 'Wholesale',
    country: '🇫🇷 France',
    status: 'inactive',
    aum: 1200000000,
  },
]

export default function MobileOptimizedListExample() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    status: '',
  })

  const formatAUM = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value)
  }

  // Mobile View : Cartes
  if (isMobile) {
    return (
      <div className="p-4">
        {/* Header Mobile */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary">
            Organisations
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFiltersOpen(true)}
              className="p-3 min-h-[44px] min-w-[44px] rounded-radius-md bg-muted hover:bg-muted/80 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>

            <button
              onClick={() => router.push('/dashboard/organisations/new')}
              className="p-3 min-h-[44px] min-w-[44px] rounded-radius-md bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Liste de cartes */}
        <div className="space-y-3">
          {MOCK_DATA.map((org) => (
            <MobileCard
              key={org.id}
              fields={[
                {
                  label: 'Nom',
                  value: org.name,
                  primary: true,
                },
                {
                  label: 'Catégorie',
                  value: org.category,
                  secondary: true,
                },
                {
                  label: 'Pays',
                  value: org.country,
                },
                {
                  label: 'AUM',
                  value: formatAUM(org.aum),
                },
                {
                  label: 'Statut',
                  value: (
                    <Badge variant={org.status === 'active' ? 'success' : 'default'}>
                      {org.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  ),
                },
              ]}
              onClick={() => router.push(`/dashboard/organisations/${org.id}`)}
            />
          ))}
        </div>

        {/* Bottom Sheet Filtres */}
        <BottomSheet
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          title="Filtres"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Catégorie
              </label>
              <select
                className="w-full min-h-[44px] px-4 py-2 rounded-radius-md border border-border bg-background"
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                <option value="">Toutes</option>
                <option value="Institution">Institution</option>
                <option value="Wholesale">Wholesale</option>
                <option value="SDG">SDG</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Statut
              </label>
              <select
                className="w-full min-h-[44px] px-4 py-2 rounded-radius-md border border-border bg-background"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setFilters({ category: '', status: '' })
                  setIsFiltersOpen(false)
                }}
              >
                Réinitialiser
              </Button>
              <Button className="flex-1" onClick={() => setIsFiltersOpen(false)}>
                Appliquer
              </Button>
            </div>
          </div>
        </BottomSheet>
      </div>
    )
  }

  // Desktop View : Tableau
  return (
    <div className="p-6">
      {/* Header Desktop */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Organisations</h1>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsFiltersOpen(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </Button>

          <Button onClick={() => router.push('/dashboard/organisations/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle organisation
          </Button>
        </div>
      </div>

      {/* Tableau Desktop */}
      <Table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Pays</th>
            <th>AUM</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_DATA.map((org) => (
            <tr
              key={org.id}
              onClick={() => router.push(`/dashboard/organisations/${org.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <td className="font-medium">{org.name}</td>
              <td>{org.category}</td>
              <td>{org.country}</td>
              <td>{formatAUM(org.aum)}</td>
              <td>
                <Badge variant={org.status === 'active' ? 'success' : 'default'}>
                  {org.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </td>
              <td>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/organisations/${org.id}/edit`)
                  }}
                >
                  Modifier
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

/*
 * USAGE dans une page Next.js :
 *
 * import MobileOptimizedListExample from '@/components/examples/MobileOptimizedList.example'
 *
 * export default function OrganisationsPage() {
 *   return <MobileOptimizedListExample />
 * }
 */
