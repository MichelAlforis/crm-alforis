/**
 * Page de configuration de l'Agent IA
 *
 * ⚠️ Cette page redirige maintenant vers /dashboard/settings/integrations?tab=ai
 * où toutes les intégrations (Email, Webhooks, IA, Connecteurs) sont centralisées.
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, ArrowRight } from 'lucide-react'
import { ROUTES, withQuery } from '@/lib/constants'

export default function AIConfigRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirection automatique après 2 secondes
    const timer = setTimeout(() => {
      router.push(withQuery(ROUTES.SETTINGS.INTEGRATIONS, { tab: 'ai' }))
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <Settings className="h-16 w-16 text-purple-600 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-0 bg-purple-600 blur-xl opacity-20 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Redirection en cours...
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            La configuration IA a été déplacée vers la page <strong>Intégrations</strong> centralisée.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => router.push(withQuery(ROUTES.SETTINGS.INTEGRATIONS, { tab: 'ai' }))}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Aller à Intégrations
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Redirection automatique dans 2 secondes...
        </p>
      </div>
    </div>
  )
}
