// hooks/useFournisseurs.ts
// ============= FOURNISSEURS CRUD HOOK =============

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { 
  Fournisseur, 
  FournisseurCreate, 
  FournisseurUpdate, 
  PaginatedResponse, 
  LoadingState,
  FournisseurDetail 
} from '@/lib/types'

interface FournisseurListState extends LoadingState {
  data?: PaginatedResponse<Fournisseur>
}

interface FournisseurSingleState extends LoadingState {
  data?: FournisseurDetail
}

interface OperationState {
  isLoading: boolean
  error?: string
  success?: boolean
}

export function useFournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<FournisseurListState>({
    isLoading: false,
  })
  
  const [single, setSingle] = useState<FournisseurSingleState>({
    isLoading: false,
  })

  const [create, setCreate] = useState<OperationState>({ isLoading: false })
  const [update, setUpdate] = useState<OperationState>({ isLoading: false })
  const [deleteOp, setDelete] = useState<OperationState>({ isLoading: false })

  // ============= FETCH FOURNISSEURS (LIST) =============
  const fetchFournisseurs = useCallback(async (skip = 0, limit = 100, search = '') => {
    setFournisseurs({ isLoading: true })
    try {
      const data = await apiClient.getFournisseurs(skip, limit, search)
      setFournisseurs({
        isLoading: false,
        data,
      })
    } catch (error: any) {
      setFournisseurs({
        isLoading: false,
        error: error.detail || 'Erreur lors du chargement',
      })
    }
  }, [])

  // ============= FETCH SINGLE FOURNISSEUR =============
  const fetchFournisseur = useCallback(async (id: number) => {
    setSingle({ isLoading: true })
    try {
      const data = await apiClient.getFournisseur(id)
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

  // ============= CREATE FOURNISSEUR =============
  const createFournisseur = useCallback(async (data: FournisseurCreate) => {
    setCreate({ isLoading: true })
    try {
      const newFournisseur = await apiClient.createFournisseur(data)
      setCreate({
        isLoading: false,
        success: true,
      })
      await fetchFournisseurs()
      return newFournisseur
    } catch (error: any) {
      setCreate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la création',
      })
      throw error
    }
  }, [fetchFournisseurs])

  // ============= UPDATE FOURNISSEUR =============
  const updateFournisseur = useCallback(async (id: number, data: FournisseurUpdate) => {
    setUpdate({ isLoading: true })
    try {
      const updated = await apiClient.updateFournisseur(id, data)
      setUpdate({
        isLoading: false,
        success: true,
      })
      await fetchFournisseur(id)
      return updated
    } catch (error: any) {
      setUpdate({
        isLoading: false,
        error: error.detail || 'Erreur lors de la mise à jour',
      })
      throw error
    }
  }, [fetchFournisseur])

  // ============= DELETE FOURNISSEUR =============
  const deleteFournisseur = useCallback(async (id: number) => {
    setDelete({ isLoading: true })
    try {
      await apiClient.deleteFournisseur(id)
      setDelete({
        isLoading: false,
        success: true,
      })
      await fetchFournisseurs()
    } catch (error: any) {
      setDelete({
        isLoading: false,
        error: error.detail || 'Erreur lors de la suppression',
      })
      throw error
    }
  }, [fetchFournisseurs])

  return {
    fournisseurs,
    single,
    create,
    update,
    delete: deleteOp,
    fetchFournisseurs,
    fetchFournisseur,
    createFournisseur,
    updateFournisseur,
    deleteFournisseur,
  }
}
