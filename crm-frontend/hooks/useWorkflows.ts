'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'

// Types
export interface Workflow {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive' | 'draft'
  trigger_type: string
  trigger_config?: any
  conditions?: any
  actions: any[]
  is_template: boolean
  execution_count: number
  last_executed_at?: string
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: number
  workflow_id: number
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  trigger_entity_type?: string
  trigger_entity_id?: number
  started_at?: string
  completed_at?: string
  execution_logs?: any[]
  error_message?: string
  actions_executed?: any[]
  created_at: string
}

export interface WorkflowStats {
  total_executions: number
  success_count: number
  failed_count: number
  skipped_count: number
  success_rate: number
  avg_duration_seconds: number
  last_execution?: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  workflow_data: any
}

interface PaginatedResponse<T> {
  total: number
  skip: number
  limit: number
  items: T[]
}

interface LoadingState {
  isLoading: boolean
  error?: string
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<LoadingState & { data?: PaginatedResponse<Workflow> }>({
    isLoading: false,
  })

  const [singleWorkflow, setSingleWorkflow] = useState<LoadingState & { data?: Workflow }>({
    isLoading: false,
  })

  const [executions, setExecutions] = useState<LoadingState & { data?: PaginatedResponse<WorkflowExecution> }>({
    isLoading: false,
  })

  const [stats, setStats] = useState<LoadingState & { data?: WorkflowStats }>({
    isLoading: false,
  })

  const [templates, setTemplates] = useState<LoadingState & { data?: WorkflowTemplate[] }>({
    isLoading: false,
  })

  const [operation, setOperation] = useState<LoadingState & { success?: boolean }>({
    isLoading: false,
  })

  // ============= FETCH WORKFLOWS (LIST) =============
  const fetchWorkflows = useCallback(async (
    skip = 0,
    limit = 100,
    filters?: { status?: string; trigger_type?: string; is_template?: boolean }
  ) => {
    setWorkflows({ isLoading: true })
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.trigger_type && { trigger_type: filters.trigger_type }),
        ...(filters?.is_template !== undefined && { is_template: filters.is_template.toString() }),
      })

      const response = await fetch(`/api/v1/workflows?${params}`)
      if (!response.ok) throw new Error('Erreur lors du chargement des workflows')

      const data = await response.json()
      setWorkflows({ isLoading: false, data })
    } catch (error: any) {
      setWorkflows({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= FETCH SINGLE WORKFLOW =============
  const fetchWorkflow = useCallback(async (id: number) => {
    setSingleWorkflow({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/${id}`)
      if (!response.ok) throw new Error('Workflow introuvable')

      const data = await response.json()
      setSingleWorkflow({ isLoading: false, data })
    } catch (error: any) {
      setSingleWorkflow({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= CREATE WORKFLOW =============
  const createWorkflow = useCallback(async (workflowData: any) => {
    setOperation({ isLoading: true })
    try {
      const response = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de la création')
      }

      const data = await response.json()
      setOperation({ isLoading: false, success: true })
      return data
    } catch (error: any) {
      setOperation({
        isLoading: false,
        error: error.message || 'Erreur lors de la création',
        success: false,
      })
      throw error
    }
  }, [])

  // ============= UPDATE WORKFLOW =============
  const updateWorkflow = useCallback(async (id: number, workflowData: any) => {
    setOperation({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de la mise à jour')
      }

      const data = await response.json()
      setOperation({ isLoading: false, success: true })
      return data
    } catch (error: any) {
      setOperation({
        isLoading: false,
        error: error.message || 'Erreur lors de la mise à jour',
        success: false,
      })
      throw error
    }
  }, [])

  // ============= DELETE WORKFLOW =============
  const deleteWorkflow = useCallback(async (id: number) => {
    setOperation({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de la suppression')
      }

      setOperation({ isLoading: false, success: true })
    } catch (error: any) {
      setOperation({
        isLoading: false,
        error: error.message || 'Erreur lors de la suppression',
        success: false,
      })
      throw error
    }
  }, [])

  // ============= ACTIVATE / DEACTIVATE WORKFLOW =============
  const toggleWorkflow = useCallback(async (id: number, status: 'active' | 'inactive') => {
    setOperation({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de l\'activation')
      }

      const data = await response.json()
      setOperation({ isLoading: false, success: true })
      return data
    } catch (error: any) {
      setOperation({
        isLoading: false,
        error: error.message || 'Erreur lors de l\'activation',
        success: false,
      })
      throw error
    }
  }, [])

  // ============= EXECUTE WORKFLOW MANUALLY =============
  const executeWorkflow = useCallback(async (
    id: number,
    trigger_entity_type: string,
    trigger_entity_id: number,
    trigger_data?: any
  ) => {
    setOperation({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_entity_type,
          trigger_entity_id,
          trigger_data,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de l\'exécution')
      }

      const data = await response.json()
      setOperation({ isLoading: false, success: true })
      return data
    } catch (error: any) {
      setOperation({
        isLoading: false,
        error: error.message || 'Erreur lors de l\'exécution',
        success: false,
      })
      throw error
    }
  }, [])

  // ============= FETCH EXECUTIONS =============
  const fetchExecutions = useCallback(async (
    workflowId: number,
    skip = 0,
    limit = 50,
    status?: string
  ) => {
    setExecutions({ isLoading: true })
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      })

      const response = await fetch(`/api/v1/workflows/${workflowId}/executions?${params}`)
      if (!response.ok) throw new Error('Erreur lors du chargement des exécutions')

      const data = await response.json()
      setExecutions({ isLoading: false, data })
    } catch (error: any) {
      setExecutions({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= FETCH STATS =============
  const fetchStats = useCallback(async (workflowId: number) => {
    setStats({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/${workflowId}/stats`)
      if (!response.ok) throw new Error('Erreur lors du chargement des statistiques')

      const data = await response.json()
      setStats({ isLoading: false, data })
    } catch (error: any) {
      setStats({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= FETCH TEMPLATES =============
  const fetchTemplates = useCallback(async () => {
    setTemplates({ isLoading: true })
    try {
      const response = await fetch('/api/v1/workflows/templates/list')
      if (!response.ok) throw new Error('Erreur lors du chargement des templates')

      const data = await response.json()
      setTemplates({ isLoading: false, data })
    } catch (error: any) {
      setTemplates({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= CREATE FROM TEMPLATE =============
  const createFromTemplate = useCallback(async (templateId: string) => {
    setOperation({ isLoading: true })
    try {
      const response = await fetch(`/api/v1/workflows/templates/${templateId}/create`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de la création depuis template')
      }

      const data = await response.json()
      setOperation({ isLoading: false, success: true })
      return data
    } catch (error: any) {
      setOperation({
        isLoading: false,
        error: error.message || 'Erreur lors de la création',
        success: false,
      })
      throw error
    }
  }, [])

  return {
    // States
    workflows,
    singleWorkflow,
    executions,
    stats,
    templates,
    operation,

    // Methods
    fetchWorkflows,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    executeWorkflow,
    fetchExecutions,
    fetchStats,
    fetchTemplates,
    createFromTemplate,
  }
}
