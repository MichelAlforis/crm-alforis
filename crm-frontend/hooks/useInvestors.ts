// hooks/useInvestors.ts
// ============= INVESTORS CRUD HOOK =============
// Encapsule toute la logique CRUD pour les investors
// Utilisable dans n'importe quel composant

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { 
  Investor, 
  InvestorCreate, 
  InvestorUpdate, 
  PaginatedResponse, 
  LoadingState,
  InvestorDetail 
} from '@/lib/types'

interface InvestorState extends LoadingState {
  data?: PaginatedResponse<Investor>
  totalPages?: number
  currentPage?: number
}

interface InvestorSingleState extends LoadingState {
  data?: InvestorDetail
}

interface OperationState {
  isLoading: boolean
  error?: string
  success?: boolean
}

export function useInvestors() {
  const [investors, setInvestors] = useState<InvestorState>({
    isLoading: false,
  })
  
  const [single, setSingle] = useState<InvestorSingleState>({
    isLoading: false,
  })

  const [create, setCreate] = useState<OperationState>({ isLoading: false })
  const [update, setUpdate] = useState<OperationState>({ isLoading: false })
  const [deleteOp, setDelete] = useState<OperationState>({ isLoading: false })

  // ============= FETCH INVESTORS (LIST) =============
  const fetchInvestors = useCallback(async (skip = 0, limit = 100, search = '') => {
    setInvestors({ isLoading: true })
    try {
      const data = await apiClient.getInvestors(skip, limit, search)
      setInvestors({
        isLoading: false,
        data,
        totalPages: data.total,
        currentPage: data.items.length,
      })
    } catch (error: any) {
      setInvestors({
        isLoading: false,
        error: error.detail || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= FETCH SINGLE INVESTOR =============
  const fetchInvestor = useCallback(async (id: number) => {
    setSingle({ isLoading: true })
    try {
      const data = await apiClient.getInvestor(id)
      setSingle({
        isLoading: false,
        data,
      })
    } catch (error: any) {
      setSingle({
        isLoading: false,
        error: error.detail || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= CREATE INVESTOR =============
  const createInvestor = useCallback(async (data: InvestorCreate) => {
    setCreate({ isLoading: true })
    try {
      const newInvestor = await apiClient.createInvestor(data)
      setCreate({
        isLoading: false,
        success: true,
      })
      // Refetch list
      await fetchInvestors()
      return newInvestor
    } catch (error: any) {
      setCreate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la création',
      })
      throw error
    }
  }, [fetchInvestors])

  // ============= UPDATE INVESTOR =============
  const updateInvestor = useCallback(async (id: number, data: InvestorUpdate) => {
    setUpdate({ isLoading: true })
    try {
      const updated = await apiClient.updateInvestor(id, data)
      setUpdate({
        isLoading: false,
        success: true,
      })
      // Refetch single
      await fetchInvestor(id)
      return updated
    } catch (error: any) {
      setUpdate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la mise à jour',
      })
      throw error
    }
  }, [fetchInvestor])

  // ============= DELETE INVESTOR =============
  const deleteInvestor = useCallback(async (id: number) => {
    setDelete({ isLoading: true })
    try {
      await apiClient.deleteInvestor(id)
      setDelete({
        isLoading: false,
        success: true,
      })
      // Refetch list
      await fetchInvestors()
    } catch (error: any) {
      setDelete({
        isLoading: false,
        error: error.detail || 'Erreur lors de la suppression',
      })
      throw error
    }
  }, [fetchInvestors])

  return {
    investors,
    single,
    create,
    update,
    delete: deleteOp,
    fetchInvestors,
    fetchInvestor,
    createInvestor,
    updateInvestor,
    deleteInvestor,
  }
}
