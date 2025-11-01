'use client'

// app/dashboard/demo-table-v2/page.tsx
// ============= DEMO TABLE V2 RESPONSIVE =============

import React from 'react'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { Card } from '@/components/shared'
import { Edit, Trash2, Eye, Mail, Phone, MapPin } from 'lucide-react'

// Mock data
interface DemoContact {
  id: number
  name: string
  email: string
  phone: string
  company: string
  location: string
  status: 'active' | 'inactive' | 'pending'
  revenue: number
  lastContact: string
}

const mockData: DemoContact[] = [
  {
    id: 1,
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    company: 'Alforis Finance',
    location: 'Paris, France',
    status: 'active',
    revenue: 125000,
    lastContact: '2025-01-15'
  },
  {
    id: 2,
    name: 'Marie Martin',
    email: 'marie.martin@example.com',
    phone: '+33 6 98 76 54 32',
    company: 'Tech Solutions',
    location: 'Lyon, France',
    status: 'pending',
    revenue: 85000,
    lastContact: '2025-01-10'
  },
  {
    id: 3,
    name: 'Pierre Bernard',
    email: 'p.bernard@example.com',
    phone: '+33 6 45 67 89 01',
    company: 'Digital Corp',
    location: 'Marseille, France',
    status: 'active',
    revenue: 210000,
    lastContact: '2025-01-20'
  },
  {
    id: 4,
    name: 'Sophie Laurent',
    email: 'sophie.l@example.com',
    phone: '+33 6 23 45 67 89',
    company: 'Innovation Labs',
    location: 'Toulouse, France',
    status: 'inactive',
    revenue: 45000,
    lastContact: '2024-12-28'
  },
  {
    id: 5,
    name: 'Thomas Petit',
    email: 'thomas.petit@example.com',
    phone: '+33 6 87 65 43 21',
    company: 'StartUp Inc',
    location: 'Nice, France',
    status: 'active',
    revenue: 95000,
    lastContact: '2025-01-18'
  }
]

export default function DemoTableV2Page() {
  const [sortConfig, setSortConfig] = React.useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({
    key: 'name',
    direction: 'asc'
  })

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Define columns with V2 features
  const columns: ColumnV2<DemoContact>[] = [
    {
      header: 'Nom',
      accessor: 'name',
      sortable: true,
      sticky: 'left', // ✨ Sticky column on the left
      priority: 'high', // 📱 Always visible on mobile
      minWidth: '200px',
      render: (value: unknown): React.ReactNode => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {String(value).charAt(0)}
          </div>
          <span className="font-medium text-gray-900 dark:text-slate-100">{String(value)}</span>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      priority: 'high', // 📱 Always visible on mobile
      maxWidth: '280px', // Force column width with table-fixed
      render: (value: unknown): React.ReactNode => (
        <a
          href={`mailto:${value}`}
          className="flex items-center gap-1 min-w-0 text-blue-600 hover:text-blue-700 hover:underline"
          title={String(value)}
        >
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate block min-w-0">{String(value)}</span>
        </a>
      )
    },
    {
      header: 'Téléphone',
      accessor: 'phone',
      priority: 'medium', // 📱 Collapsed by default on mobile
      render: (value: unknown): React.ReactNode => (
        <a
          href={`tel:${value}`}
          className="text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white dark:text-slate-100 flex items-center gap-1"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{String(value)}</span>
        </a>
      )
    },
    {
      header: 'Entreprise',
      accessor: 'company',
      sortable: true,
      priority: 'medium', // 📱 Collapsed by default on mobile
      className: 'max-w-[180px]',
      render: (value: unknown): React.ReactNode => (
        <span className="text-gray-700 dark:text-slate-300 truncate block" title={String(value)}>{String(value)}</span>
      )
    },
    {
      header: 'Localisation',
      accessor: 'location',
      priority: 'low', // 📱 Collapsed by default on mobile
      render: (value: unknown): React.ReactNode => (
        <div className="flex items-center gap-1 text-gray-600 dark:text-slate-400 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{String(value)}</span>
        </div>
      )
    },
    {
      header: 'Statut',
      accessor: 'status',
      sortable: true,
      priority: 'high', // 📱 Always visible on mobile
      render: (value: unknown): React.ReactNode => {
        const statusValue = value as 'active' | 'inactive' | 'pending'
        const styles = {
          active: 'bg-green-100 text-green-800 border-green-200',
          inactive: 'bg-gray-100 dark:bg-slate-800 text-gray-800 border-gray-200 dark:border-slate-700',
          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
        const labels = {
          active: 'Actif',
          inactive: 'Inactif',
          pending: 'En attente'
        }

        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[statusValue]}`}>
            {labels[statusValue]}
          </span>
        )
      }
    },
    {
      header: 'Revenu',
      accessor: 'revenue',
      sortable: true,
      priority: 'medium', // 📱 Collapsed by default on mobile
      render: (value: unknown): React.ReactNode => (
        <span className="font-semibold text-green-700">
          {new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0
          }).format(Number(value))}
        </span>
      )
    },
    {
      header: 'Dernier Contact',
      accessor: 'lastContact',
      sortable: true,
      priority: 'low', // 📱 Collapsed by default on mobile
      render: (value: unknown): React.ReactNode => (
        <span className="text-gray-600 dark:text-slate-400 text-sm">
          {new Date(String(value)).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right', // ✨ Sticky column on the right
      priority: 'high', // 📱 Always visible on mobile
      minWidth: '120px',
      render: (_: unknown, row: DemoContact, _index: number) => {
        const actions: OverflowAction[] = [
          {
            label: 'Voir',
            icon: Eye,
            onClick: () => alert(`Voir contact: ${row.name}`),
            variant: 'default'
          },
          {
            label: 'Modifier',
            icon: Edit,
            onClick: () => alert(`Modifier contact: ${row.name}`),
            variant: 'default'
          },
          {
            label: 'Supprimer',
            icon: Trash2,
            onClick: () => {
              if (confirm(`Supprimer ${row.name}?`)) {
                alert('Contact supprimé!')
              }
            },
            variant: 'danger'
          }
        ]

        return (
          <OverflowMenu
            actions={actions}
            threshold={3}
          />
        )
      }
    }
  ]

  // Sort data
  const sortedData = React.useMemo(() => {
    const sorted = [...mockData]
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key]
        const bValue = (b as any)[sortConfig.key]

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sorted
  }, [sortConfig])

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          Demo Table V2 Responsive 🚀
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Table avancée avec colonnes sticky, collapse mobile, et détection du pointer
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-2xl mb-2">📌</div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Colonnes Sticky</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
            "Nom" fixé à gauche, "Actions" à droite
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-2xl mb-2">📱</div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Collapse Mobile</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
            Priorité: high → visible, low → replié
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="text-2xl mb-2">👆</div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Pointer Detection</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
            Adapte les interactions tactiles vs souris
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="text-2xl mb-2">⋮</div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Menu Overflow</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
            Actions groupées en "..." sur tactile
          </p>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-blue-200">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3">
          📋 Instructions de test
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">Desktop:</span>
            <span>Scrollez horizontalement → "Nom" et "Actions" restent fixes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-green-600">Mobile:</span>
            <span>Vue cards avec bouton "Voir plus" pour les colonnes basse priorité</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-purple-600">Tablette:</span>
            <span>Table complète avec scroll horizontal si nécessaire</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-orange-600">Menu "...":</span>
            <span>Sur tactile → 3 boutons groupés. Sur souris → boutons visibles</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-purple-600">Tri:</span>
            <span>Cliquez sur les en-têtes pour trier (Nom, Email, Statut, Revenu, Date)</span>
          </li>
        </ul>
      </Card>

      {/* Table V2 */}
      <Card className="overflow-hidden p-0">
        <TableV2
          columns={columns}
          data={sortedData}
          sortConfig={sortConfig}
          onSort={handleSort}
          variant="striped"
          size="md"
          stickyHeader={true}
          mobileCollapse={true}
          overflowMenu={true}
          rowKey="id"
        />
      </Card>

      {/* Technical Details */}
      <Card className="p-6 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3">
          🔧 Détails techniques
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Fonctionnalités V2:</h3>
            <ul className="space-y-1 text-gray-700 dark:text-slate-300 list-disc list-inside">
              <li>Colonnes sticky (left/right)</li>
              <li>Priorités de colonnes (high/medium/low)</li>
              <li>Collapse/expand sur mobile</li>
              <li>Détection pointer (coarse/fine)</li>
              <li>Responsive breakpoints (md: 768px)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Props TableV2:</h3>
            <ul className="space-y-1 text-gray-700 dark:text-slate-300 list-disc list-inside">
              <li><code className="text-xs bg-gray-200 px-1 rounded">sticky: 'left' | 'right'</code></li>
              <li><code className="text-xs bg-gray-200 px-1 rounded">priority: 'high' | 'medium' | 'low'</code></li>
              <li><code className="text-xs bg-gray-200 px-1 rounded">mobileCollapse: boolean</code></li>
              <li><code className="text-xs bg-gray-200 px-1 rounded">overflowMenu: boolean</code></li>
              <li><code className="text-xs bg-gray-200 px-1 rounded">rowKey: string | function</code></li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
