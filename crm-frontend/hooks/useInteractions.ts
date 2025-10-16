// hooks/useInteractions.ts
// ============= INTERACTIONS CRUD HOOK =============

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { 
  Interaction, 
  InteractionCreate, 
  InteractionUpdate, 
  PaginatedResponse,
  LoadingState 
} from '@/lib/types'

interface InteractionListState extends LoadingState {
  data?: PaginatedResponse<Interaction>
}

interface OperationState {
  isLoading: boolean
  error?: string
  success?: boolean
}

export function useInteractions(investorId: number) {
  const [interactions, setInteractions] = useState<InteractionListState>({
    isLoading: false,
  })

  const [create, setCreate] = useState<OperationState>({ isLoading: false })
  const [update, setUpdate] = useState<OperationState>({ isLoading: false })
  const [deleteOp, setDelete] = useState<OperationState>({ isLoading: false })

  // ============= FETCH INTERACTIONS =============
  const fetchInteractions = useCallback(async (skip = 0, limit = 50) => {
    setInteractions({ isLoading: true })
    try {
      const data = await apiClient.getInteractions(investorId, skip, limit)
      setInteractions({
        isLoading: false,
        data,
      })
    } catch (error: any) {
      setInteractions({
        isLoading: false,
        error: error.detail || 'Erreur lors du chargement',
      })
    }
  }, [investorId])

  // ============= CREATE INTERACTION =============
  const createInteraction = useCallback(async (data: InteractionCreate) => {
    setCreate({ isLoading: true })
    try {
      const newInteraction = await apiClient.createInteraction(investorId, data)
      setCreate({
        isLoading: false,
        success: true,
      })
      await fetchInteractions()
      return newInteraction
    } catch (error: any) {
      setCreate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la création',
      })
      throw error
    }
  }, [investorId, fetchInteractions])

  // ============= UPDATE INTERACTION =============
  const updateInteraction = useCallback(async (interactionId: number, data: InteractionUpdate) => {
    setUpdate({ isLoading: true })
    try {
      const updated = await apiClient.updateInteraction(interactionId, data)
      setUpdate({
        isLoading: false,
        success: true,
      })
      await fetchInteractions()
      return updated
    } catch (error: any) {
      setUpdate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la mise à jour',
      })
      throw error
    }
  }, [investorId, fetchInteractions])

  // ============= DELETE INTERACTION =============
  const deleteInteraction = useCallback(async (interactionId: number) => {
    setDelete({ isLoading: true })
    try {
      await apiClient.deleteInteraction(interactionId)
      setDelete({
        isLoading: false,
        success: true,
      })
      await fetchInteractions()
    } catch (error: any) {
      setDelete({
        isLoading: false,
        error: error.detail || 'Erreur lors de la suppression',
      })
      throw error
    }
  }, [investorId, fetchInteractions])

  return {
    interactions,
    create,
    update,
    delete: deleteOp,
    fetchInteractions,
    createInteraction,
    updateInteraction,
    deleteInteraction,
  }
}
