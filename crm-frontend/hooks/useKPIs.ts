// hooks/useKPIs.ts
// ============= KPIs CRUD HOOK (LEGACY - DEPRECATED) =============
// ❌ LEGACY: Ce hook est déprécié et ne doit plus être utilisé
// ✅ Utiliser: Les endpoints /dashboards/stats à la place
// Migration: KPIs → Dashboards

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { KPI, KPICreate, KPIUpdate, LoadingState } from '@/lib/types'

interface KPIListState extends LoadingState {
  data?: KPI[]
}

interface OperationState {
  isLoading: boolean
  error?: string
  success?: boolean
}

export function useKPIs(investorId: number) {
  const [kpis, setKPIs] = useState<KPIListState>({
    isLoading: false,
  })

  const [create, setCreate] = useState<OperationState>({ isLoading: false })
  const [update, setUpdate] = useState<OperationState>({ isLoading: false })
  const [deleteOp, setDelete] = useState<OperationState>({ isLoading: false })

  // ============= FETCH KPIs =============
  const fetchKPIs = useCallback(async (year?: number, month?: number) => {
    setKPIs({ isLoading: true })
    try {
      const data = await apiClient.getKPIs(investorId, year, month)
      setKPIs({
        isLoading: false,
        data,
      })
    } catch (error: any) {
      setKPIs({
        isLoading: false,
        error: error.detail || 'Erreur lors du chargement',
      })
    }
  }, [investorId])

  // ============= CREATE KPI =============
  const createKPI = useCallback(async (data: KPICreate) => {
    setCreate({ isLoading: true })
    try {
      const newKPI = await apiClient.createKPI(investorId, data)
      setCreate({
        isLoading: false,
        success: true,
      })
      await fetchKPIs()
      return newKPI
    } catch (error: any) {
      setCreate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la création',
      })
      throw error
    }
  }, [investorId, fetchKPIs])

  // ============= UPDATE KPI =============
  const updateKPI = useCallback(async (kpiId: number, data: KPIUpdate) => {
    setUpdate({ isLoading: true })
    try {
      const updated = await apiClient.updateKPI(kpiId, data)
      setUpdate({
        isLoading: false,
        success: true,
      })
      await fetchKPIs()
      return updated
    } catch (error: any) {
      setUpdate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la mise à jour',
      })
      throw error
    }
  }, [investorId, fetchKPIs])

  // ============= DELETE KPI =============
  const deleteKPI = useCallback(async (kpiId: number) => {
    setDelete({ isLoading: true })
    try {
      await apiClient.deleteKPI(kpiId)
      setDelete({
        isLoading: false,
        success: true,
      })
      await fetchKPIs()
    } catch (error: any) {
      setDelete({
        isLoading: false,
        error: error.detail || 'Erreur lors de la suppression',
      })
      throw error
    }
  }, [investorId, fetchKPIs])

  return {
    kpis,
    create,
    update,
    delete: deleteOp,
    fetchKPIs,
    createKPI,
    updateKPI,
    deleteKPI,
  }
}
