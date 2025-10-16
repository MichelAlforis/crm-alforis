// app/auth/login/page.tsx
// ============= LOGIN PAGE =============

'use client'

import React from 'react'
import { LoginForm } from '@/components/forms'
import { useAuth } from '@/hooks/useAuth'
import { Alert } from '@/components/shared'

export default function LoginPage() {
  const { login, isSubmitting, error } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-bleu to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <LoginForm
          onSubmit={login}
          isLoading={isSubmitting}
          error={error}
        />
      </div>
    </div>
  )
}
