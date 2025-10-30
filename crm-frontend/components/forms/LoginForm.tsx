// components/forms/LoginForm.tsx
// ============= LOGIN FORM - RÉUTILISABLE =============

'use client'

import React, { useState, useEffect } from 'react'
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
    setFocus,
  } = useForm<LoginRequest>({
    mode: 'onBlur',
  })

  const [localError, setLocalError] = useState<string>('')

  // Focus automatique sur le premier champ en erreur
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0] as keyof LoginRequest
    if (firstErrorField) {
      setFocus(firstErrorField)
    }
  }, [errors, setFocus])

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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="w-full space-y-6">
      {(error || localError) && (
        <Alert
          type="error"
          message={error || localError}
          onClose={() => setLocalError('')}
        />
      )}

      <div className="space-y-4">
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
          className="transition-all duration-200"
        />

        <div>
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
            className="transition-all duration-200"
          />

          {/* Forgot Password Link */}
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => {
                // Phase 2: Will navigate to /auth/forgot-password
                showToast({
                  type: 'info',
                  title: 'Fonctionnalité à venir',
                  message: 'La réinitialisation de mot de passe sera disponible prochainement.',
                })
              }}
              className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors inline-flex items-center gap-1 group"
            >
              <span>Mot de passe oublié?</span>
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full mt-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        Se connecter
      </Button>
    </form>
  )
}
