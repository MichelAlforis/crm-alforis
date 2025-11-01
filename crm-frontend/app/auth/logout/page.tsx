// app/auth/logout/page.tsx
// ============= LOGOUT PAGE =============

'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/shared'
import { PageContainer } from '@/components/shared'

export default function LogoutPage() {
  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [logout])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <PageContainer width="narrow">
        <Card>
          <p className="text-center text-text-primary">Déconnexion en cours...</p>
        </Card>
      </PageContainer>
    </div>
  )
}
