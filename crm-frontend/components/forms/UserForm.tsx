'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/shared'
import { Button } from '@/components/shared/Button'
import { UserCreate, UserUpdate } from '@/hooks/useUsers'

interface UserFormProps {
  initialData?: {
    id?: number
    email?: string
    username?: string
    full_name?: string
    is_active?: boolean
    is_superuser?: boolean
    role_id?: number
    team_id?: number
  }
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit'
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserCreate & { confirm_password?: string }>({
    defaultValues: {
      email: initialData?.email || '',
      username: initialData?.username || '',
      full_name: initialData?.full_name || '',
      is_active: initialData?.is_active ?? true,
      is_superuser: initialData?.is_superuser ?? false,
      role_id: initialData?.role_id,
      team_id: initialData?.team_id,
    },
  })

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

  const handleFormSubmit = async (data: UserCreate & { confirm_password?: string }) => {
    // Retirer confirm_password avant envoi
    const { confirm_password: _confirmPassword, ...submitData } = data
    await onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Email */}
      <Input
        label="Email *"
        type="email"
        {...register('email', {
          required: 'Email requis',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Email invalide',
          },
        })}
        error={errors.email?.message}
        placeholder="utilisateur@exemple.com"
        disabled={isLoading}
      />

      {/* Username */}
      <Input
        label="Nom d'utilisateur"
        type="text"
        {...register('username', {
          maxLength: {
            value: 150,
            message: 'Maximum 150 caractères',
          },
        })}
        error={errors.username?.message}
        placeholder="johndoe"
        disabled={isLoading}
      />

      {/* Full Name */}
      <Input
        label="Nom complet"
        type="text"
        {...register('full_name', {
          maxLength: {
            value: 255,
            message: 'Maximum 255 caractères',
          },
        })}
        error={errors.full_name?.message}
        placeholder="John Doe"
        disabled={isLoading}
      />

      {/* Password (obligatoire en création, optionnel en édition) */}
      {mode === 'create' ? (
        <>
          <Input
            label="Mot de passe *"
            type="password"
            {...register('password', {
              required: 'Mot de passe requis',
              minLength: {
                value: 6,
                message: 'Minimum 6 caractères',
              },
            })}
            error={errors.password?.message}
            placeholder="••••••••"
            disabled={isLoading}
          />

          <Input
            label="Confirmer mot de passe *"
            type="password"
            {...register('confirm_password', {
              required: 'Confirmation requise',
              validate: (value, formValues) =>
                value === formValues.password || 'Les mots de passe ne correspondent pas',
            })}
            error={errors.confirm_password?.message}
            placeholder="••••••••"
            disabled={isLoading}
          />
        </>
      ) : (
        <div className="space-y-2">
          <Input
            label="Nouveau mot de passe (optionnel)"
            type="password"
            {...register('password', {
              minLength: {
                value: 6,
                message: 'Minimum 6 caractères',
              },
            })}
            error={errors.password?.message}
            placeholder="Laisser vide pour ne pas changer"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            Laissez vide si vous ne souhaitez pas modifier le mot de passe
          </p>
        </div>
      )}

      {/* Role Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Rôle
        </label>
        <select
          {...register('role_id')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-bleu focus:border-transparent"
          disabled={isLoading}
        >
          <option value="">-- Aucun rôle --</option>
          <option value="1">Admin</option>
          <option value="2">Manager</option>
          <option value="3">User</option>
          <option value="4">Viewer</option>
        </select>
        <p className="text-xs text-gray-500">
          Le rôle définit les permissions de l'utilisateur
        </p>
      </div>

      {/* Team Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Équipe
        </label>
        <select
          {...register('team_id')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-bleu focus:border-transparent"
          disabled={isLoading}
        >
          <option value="">-- Aucune équipe --</option>
          <option value="1">Équipe Ventes</option>
          <option value="2">Équipe Support</option>
          <option value="3">Équipe Marketing</option>
        </select>
        <p className="text-xs text-gray-500">
          L'équipe détermine l'accès aux données
        </p>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('is_active')}
            className="rounded border-gray-300 dark:border-slate-600 text-bleu focus:ring-bleu"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-700 dark:text-slate-300">
            Utilisateur actif
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('is_superuser')}
            className="rounded border-gray-300 dark:border-slate-600 text-bleu focus:ring-bleu"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-700 dark:text-slate-300">
            Super utilisateur (accès complet)
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className="flex-1"
        >
          {mode === 'create' ? 'Créer' : 'Mettre à jour'}
        </Button>
      </div>
    </form>
  )
}
