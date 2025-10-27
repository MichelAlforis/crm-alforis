'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/shared'

// Types
interface SystemMetrics {
  cpu: {
    percent: number
    count: number
    status: 'healthy' | 'warning' | 'critical'
  }
  memory: {
    total_gb: number
    used_gb: number
    percent: number
    status: 'healthy' | 'warning' | 'critical'
  }
  disk: {
    total_gb: number
    used_gb: number
    percent: number
    status: 'healthy' | 'warning' | 'critical'
  }
}

interface DatabaseMetrics {
  tasks_24h: {
    total: number
    completed: number
    failed: number
    success_rate: number
  }
  notifications: {
    unread: number
  }
  connections: {
    active?: number
  }
  status: string
}

interface WorkerInfo {
  status: string
  healthy: boolean
}

interface Workers {
  workers: Record<string, WorkerInfo>
  status: string
}

interface MonitoringData {
  status: 'healthy' | 'warning' | 'degraded' | 'critical'
  timestamp: string
  system: SystemMetrics
  database: DatabaseMetrics
  workers: Workers
  errors: any[]
  uptime: string
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMonitoring = async () => {
    try {
      // Use base URL without /api/v1 suffix
      const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(`${API_BASE}/api/v1/monitoring/health`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      // If 401, token missing or expired - redirect to login
      if (response.status === 401) {
        if (token) {
          localStorage.removeItem('access_token')
        }
        window.location.href = '/auth/login?redirect=/dashboard/monitoring'
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data')
      }

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des métriques')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoring()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchMonitoring()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'degraded':
        return 'text-orange-600 bg-orange-50'
      case 'critical':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-semibold uppercase'
    const colorClasses = getStatusColor(status)
    return `${baseClasses} ${colorClasses}`
  }

  const getProgressColor = (percent: number) => {
    if (percent < 60) return 'bg-green-500'
    if (percent < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Monitoring Système</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Monitoring Système</h1>
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <p className="text-red-800 font-semibold">Erreur</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Monitoring Système</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸ Auto-refresh OFF'}
          </button>
          <span className={getStatusBadge(data.status)}>{data.status}</span>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* CPU */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">CPU</h3>
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(data.system.cpu.status)}`}>
                {data.system.cpu.status}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.system.cpu.percent}%</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                  data.system.cpu.percent
                )}`}
                style={{ width: `${Math.min(data.system.cpu.percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{data.system.cpu.count} cores</p>
          </div>
        </Card>

        {/* Memory */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Memory</h3>
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(data.system.memory.status)}`}>
                {data.system.memory.status}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.system.memory.percent}%</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                  data.system.memory.percent
                )}`}
                style={{ width: `${Math.min(data.system.memory.percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {data.system.memory.used_gb.toFixed(1)} / {data.system.memory.total_gb.toFixed(1)} GB
            </p>
          </div>
        </Card>

        {/* Disk */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Disk</h3>
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(data.system.disk.status)}`}>
                {data.system.disk.status}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.system.disk.percent}%</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                  data.system.disk.percent
                )}`}
                style={{ width: `${Math.min(data.system.disk.percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {data.system.disk.used_gb.toFixed(1)} / {data.system.disk.total_gb.toFixed(1)} GB
            </p>
          </div>
        </Card>
      </div>

      {/* Database & Workers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Database Stats */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Database (24h)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total tasks</span>
                <span className="font-semibold">{data.database.tasks_24h.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{data.database.tasks_24h.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{data.database.tasks_24h.failed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success rate</span>
                <span className="font-semibold">{data.database.tasks_24h.success_rate}%</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-gray-600">Unread notifications</span>
                <span className="font-semibold">{data.database.notifications.unread}</span>
              </div>
              {data.database.connections.active !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active connections</span>
                  <span className="font-semibold">{data.database.connections.active}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Workers Status */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Workers</h3>
            <div className="space-y-3">
              {Object.entries(data.workers.workers).map(([name, worker]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{name}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      worker.healthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {worker.status}
                  </span>
                </div>
              ))}
              {Object.keys(data.workers.workers).length === 0 && (
                <p className="text-sm text-gray-500 italic">No workers configured</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Errors */}
      {data.errors && data.errors.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-red-800">Recent Errors</h3>
            <div className="space-y-2">
              {data.errors.map((error, index) => (
                <div key={index} className="bg-white p-3 rounded border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{error.title || error.type}</p>
                      {error.description && (
                        <p className="text-xs text-gray-600 mt-1">{error.description}</p>
                      )}
                    </div>
                    {error.timestamp && (
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Last updated: {new Date(data.timestamp).toLocaleString('fr-FR')}
      </div>
    </div>
  )
}
