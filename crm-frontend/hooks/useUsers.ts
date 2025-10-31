/**
 * Hook useUsers - Gestion des utilisateurs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export interface User {
  id: number
  email: string
  username?: string
  full_name?: string
  is_active: boolean
  is_superuser: boolean
  role_id?: number
  team_id?: number
  role_name?: string
  team_name?: string
  created_at: string
  updated_at: string
}

export interface UserCreate {
  email: string
  username?: string
  full_name?: string
  password: string
  is_active?: boolean
  is_superuser?: boolean
  role_id?: number
  team_id?: number
}

export interface UserUpdate {
  email?: string
  username?: string
  full_name?: string
  password?: string
  is_active?: boolean
  is_superuser?: boolean
  role_id?: number
  team_id?: number
}

export interface UserListResponse {
  items: User[]
  total: number
  skip: number
  limit: number
}

export interface UseUsersOptions {
  skip?: number
  limit?: number
  q?: string
  role_id?: number
  team_id?: number
  include_inactive?: boolean
}

/**
 * Hook pour lister les utilisateurs
 */
export function useUsers(options: UseUsersOptions = {}) {
  const { skip = 0, limit = 50, q, role_id, team_id, include_inactive = false } = options

  return useQuery<UserListResponse>({
    queryKey: ['users', skip, limit, q, role_id, team_id, include_inactive],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('skip', skip.toString())
      params.append('limit', limit.toString())
      if (q) params.append('q', q)
      if (role_id) params.append('role_id', role_id.toString())
      if (team_id) params.append('team_id', team_id.toString())
      if (include_inactive) params.append('include_inactive', 'true')

      const response = await apiClient.get<UserListResponse>(`/users?${params.toString()}`)
      return response.data
    },
  })
}

/**
 * Hook pour récupérer un utilisateur par ID
 */
export function useUser(userId: number | undefined) {
  return useQuery<User>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await apiClient.get<User>(`/users/${userId}`)
      return response.data
    },
    enabled: !!userId,
  })
}

/**
 * Hook pour créer un utilisateur
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserCreate) => {
      const response = await apiClient.post('/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook pour mettre à jour un utilisateur
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserUpdate }) => {
      const response = await apiClient.put(`/users/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    },
  })
}

/**
 * Hook pour supprimer un utilisateur
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, hardDelete = false }: { id: number; hardDelete?: boolean }) => {
      const params = hardDelete ? '?hard_delete=true' : ''
      await apiClient.delete(`/users/${id}${params}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
