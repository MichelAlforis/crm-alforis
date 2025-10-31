'use client'

import { useState, useEffect } from 'react'
import { ENTITY_TYPE_LABELS } from "@/lib/enums/labels"
import { Shield, Search, Download, Filter, Eye, Trash2, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AccessLog {
  id: number
  entity_type: string
  entity_id: number
  access_type: string
  endpoint: string | null
  purpose: string | null
  user_id: number | null
  ip_address: string | null
  accessed_at: string
}

const ACCESS_TYPE_LABELS: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  read: { label: 'Lecture', icon: <Eye className="w-4 h-4" />, color: 'text-blue-600' },
  export: {
    label: 'Export',
    icon: <Download className="w-4 h-4" />,
    color: 'text-purple-600',
  },
  delete: { label: 'Suppression', icon: <Trash2 className="w-4 h-4" />, color: 'text-red-600' },
  anonymize: {
    label: 'Anonymisation',
    icon: <Lock className="w-4 h-4" />,
    color: 'text-orange-600',
  },
}

export default function AccessLogsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAccessType, setFilterAccessType] = useState<string>('all')
  const [filterEntityType, setFilterEntityType] = useState<string>('all')

  useEffect(() => {
    fetchAccessLogs()
  }, [])

  const fetchAccessLogs = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filterAccessType !== 'all') params.append('access_type', filterAccessType)
      if (filterEntityType !== 'all') params.append('entity_type', filterEntityType)
      params.append('limit', '100')

      const response = await apiClient.get(`/rgpd/access-logs?${params.toString()}`)
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Failed to fetch access logs:', error)
      showToast('Erreur lors du chargement des logs', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (filterAccessType !== 'all') params.append('access_type', filterAccessType)
      if (filterEntityType !== 'all') params.append('entity_type', filterEntityType)
      params.append('limit', '1000')

      const response = await apiClient.get(`/rgpd/access-logs?${params.toString()}`)
      const data = response.data.logs || []

      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `access-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast('Logs exportés avec succès', 'success')
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Erreur lors de l\'export', 'error')
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.endpoint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  // Check if user is admin
  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Accès restreint</h2>
          <p className="text-gray-600 dark:text-slate-400">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Logs d'accès RGPD</h1>
        </div>
        <p className="text-gray-600 dark:text-slate-400">
          Traçabilité des accès aux données personnelles (conformité CNIL)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Endpoint, IP, purpose..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Access Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Type d'accès</label>
            <select
              value={filterAccessType}
              onChange={(e) => {
                setFilterAccessType(e.target.value)
                setTimeout(fetchAccessLogs, 100)
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
            >
              <option value="all">Tous</option>
              <option value="read">Lecture</option>
              <option value="export">Export</option>
              <option value="delete">Suppression</option>
              <option value="anonymize">Anonymisation</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Type d'entité</label>
            <select
              value={filterEntityType}
              onChange={(e) => {
                setFilterEntityType(e.target.value)
                setTimeout(fetchAccessLogs, 100)
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
            >
              <option value="all">Tous</option>
              <option value="person">Personnes</option>
              <option value="organisation">Organisations</option>
              <option value="user">Utilisateurs</option>
              <option value="email_message">Emails</option>
              <option value="interaction">Interactions</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter (JSON)
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{filteredLogs.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Lectures</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredLogs.filter((l) => l.access_type === 'read').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Exports</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredLogs.filter((l) => l.access_type === 'export').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Suppressions</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredLogs.filter((l) => l.access_type === 'delete').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Raison
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucun log trouvé
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {format(new Date(log.accessed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`flex items-center gap-2 ${
                          ACCESS_TYPE_LABELS[log.access_type]?.color || 'text-gray-600 dark:text-slate-400'
                        }`}
                      >
                        {ACCESS_TYPE_LABELS[log.access_type]?.icon}
                        <span className="text-sm font-medium">
                          {ACCESS_TYPE_LABELS[log.access_type]?.label || log.access_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                        </span>
                        <span className="text-xs text-gray-500">ID: {log.entity_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 max-w-xs truncate">
                      {log.endpoint || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 max-w-xs truncate">
                      {log.purpose || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                      {log.user_id || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
