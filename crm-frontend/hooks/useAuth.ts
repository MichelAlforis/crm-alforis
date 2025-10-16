// hooks/useAuth.ts
// ============= AUTH HOOK =============
// Encapsule toute la logique d'authentification
// Utilisable partout: composants, pages, d'autres hooks

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { LoginRequest, FormState, AuthState } from '@/lib/types'

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
    if (!token) {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
      }))
      return
    }

    let isMounted = true
    ;(async () => {
      try {
        const profile = await apiClient.getCurrentUser()
        if (!isMounted) return
        setState({
          isAuthenticated: !!profile,
          isLoading: false,
          user: profile || undefined,
        })
      } catch (error: any) {
        console.error('Failed to fetch current user:', error)
        apiClient.clearToken()
        if (!isMounted) return
        setState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Session expirée, veuillez vous reconnecter',
        })
        router.push('/auth/login')
      }
    })()

    return () => {
      isMounted = false
    }
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

      const profile = await apiClient.getCurrentUser()
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: profile || undefined,
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
      user: undefined,
    })
    router.push('/auth/login')
  }, [router])

  return {
    ...state,
    ...formState,
    user: state.user,
    login,
    logout,
  }
}
