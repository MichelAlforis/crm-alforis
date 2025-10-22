/**
 * Hook pour gérer les configurations email
 */

import { useState } from 'react'
import { apiClient } from '@/lib/api'

export type EmailProvider = 'resend' | 'sendgrid' | 'mailgun'

export interface EmailConfiguration {
  id: number
  name: string
  description?: string
  provider: EmailProvider
  is_active: boolean
  from_name?: string
  from_email?: string
  reply_to?: string
  rate_limit_per_minute: number
  batch_size: number
  track_opens: boolean
  track_clicks: boolean
  created_at: string
  updated_at?: string
  last_tested_at?: string
  test_status?: 'success' | 'failed'
  test_error?: string
}

export interface EmailConfigurationCreate {
  name: string
  description?: string
  provider: EmailProvider
  api_key: string
  mailgun_domain?: string
  from_name?: string
  from_email?: string
  reply_to?: string
  rate_limit_per_minute?: number
  batch_size?: number
  track_opens?: boolean
  track_clicks?: boolean
  is_active?: boolean
}

export interface EmailConfigurationUpdate {
  name?: string
  description?: string
  api_key?: string
  mailgun_domain?: string
  from_name?: string
  from_email?: string
  reply_to?: string
  rate_limit_per_minute?: number
  batch_size?: number
  track_opens?: boolean
  track_clicks?: boolean
  is_active?: boolean
}

export interface TestEmailRequest {
  test_email: string
}

export interface TestEmailResponse {
  success: boolean
  message: string
  provider: EmailProvider
  tested_at: string
  error?: string
}

export function useEmailConfig() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listConfigurations = async (): Promise<EmailConfiguration[]> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<EmailConfiguration[]>('/api/v1/email-config/')
      return response.data
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors du chargement des configurations'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const getActiveConfiguration = async (): Promise<EmailConfiguration | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<EmailConfiguration>('/api/v1/email-config/active')
      return response.data
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null // Aucune configuration active
      }
      const message = err?.response?.data?.detail || 'Erreur lors du chargement de la configuration'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const createConfiguration = async (data: EmailConfigurationCreate): Promise<EmailConfiguration> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<EmailConfiguration>('/api/v1/email-config/', data)
      return response.data
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors de la création'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateConfiguration = async (
    id: number,
    data: EmailConfigurationUpdate
  ): Promise<EmailConfiguration> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.patch<EmailConfiguration>(`/api/v1/email-config/${id}`, data)
      return response.data
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors de la mise à jour'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConfiguration = async (id: number): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await apiClient.delete(`/api/v1/email-config/${id}`)
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors de la suppression'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const activateConfiguration = async (id: number): Promise<EmailConfiguration> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<EmailConfiguration>(`/api/v1/email-config/${id}/activate`)
      return response.data
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors de l\'activation'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const deactivateConfiguration = async (id: number): Promise<EmailConfiguration> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<EmailConfiguration>(`/api/v1/email-config/${id}/deactivate`)
      return response.data
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors de la désactivation'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const testConfiguration = async (
    id: number,
    testEmail: string
  ): Promise<TestEmailResponse> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<TestEmailResponse>(
        `/api/v1/email-config/${id}/test`,
        { test_email: testEmail }
      )
      return response.data
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Erreur lors du test'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    listConfigurations,
    getActiveConfiguration,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    activateConfiguration,
    deactivateConfiguration,
    testConfiguration,
  }
}
