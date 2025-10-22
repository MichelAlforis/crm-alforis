// components/forms/LoginForm.tsx
// ============= LOGIN FORM - RÉUTILISABLE =============

'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert } from '@/components/shared'
import { LoginRequest } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'

interface LoginFormProps {
  onSubmit: (data: LoginRequest) => Promise<void>
  isLoading?: boolean
  error?: string
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    mode: 'onBlur',
  })

  const [localError, setLocalError] = useState<string>('')

  const handleFormSubmit = async (data: LoginRequest) => {
    try {
      setLocalError('')
      await onSubmit(data)
      showToast({
        type: 'success',
        title: 'Connexion réussie',
        message: 'Bienvenue sur le portail TPM Finance.',
      })
    } catch (err: any) {
      const message = err?.message || 'Une erreur est survenue'
      setLocalError(message)
      showToast({
        type: 'error',
        title: 'Connexion impossible',
        message,
      })
      // Ne pas re-throw: l'erreur est déjà gérée avec le Toast
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ardoise mb-2">Connexion</h2>
        <p className="text-gray-600">Connectez-vous à votre compte CRM</p>
      </div>

      {(error || localError) && (
        <Alert 
          type="error" 
          message={error || localError}
          onClose={() => setLocalError('')}
        />
      )}

      <Input
        label="Email"
        type="email"
        {...register('email', {
          required: 'Email requis',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Email invalide',
          },
        })}
        error={errors.email?.message}
        placeholder="vous@example.com"
      />

      <Input
        label="Mot de passe"
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
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Se connecter
      </Button>
    </form>
  )
}
