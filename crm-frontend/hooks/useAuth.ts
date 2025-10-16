// hooks/useAuth.ts
// ============= AUTH HOOK =============
// Encapsule toute la logique d'authentification
// Utilisable partout: composants, pages, d'autres hooks

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { LoginRequest, TokenResponse, FormState } from '@/lib/types'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  })
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
  })

  // Vérifier le token au montage
  useEffect(() => {
    const token = apiClient.getToken()
    setState(prev => ({
      ...prev,
      isAuthenticated: !!token,
      isLoading: false,
    }))
  }, [])

  // ============= LOGIN =============
  const login = useCallback(async (credentials: LoginRequest) => {
    console.log('🔐 Login attempt:', credentials.email)
    setFormState({ isSubmitting: true })
    try {
      console.log('📡 Calling API...')
      const response = await apiClient.login(credentials)
      console.log('✅ Login successful:', response)
      apiClient.setToken(response.access_token)

      setState({
        isAuthenticated: true,
        isLoading: false,
      })
      setFormState({ isSubmitting: false, success: true })

      console.log('🔄 Redirecting to dashboard...')
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('❌ Login error:', error)
      const errorMessage = error.detail || 'Erreur de connexion'
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      })
      setFormState({
        isSubmitting: false,
        error: errorMessage,
      })
    }
  }, [router])

  // ============= LOGOUT =============
  const logout = useCallback(async () => {
    await apiClient.logout()
    setState({
      isAuthenticated: false,
      isLoading: false,
    })
    router.push('/auth/login')
  }, [router])

  return {
    ...state,
    ...formState,
    login,
    logout,
  }
}