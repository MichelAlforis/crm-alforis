'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OutlookCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      // Envoyer l'erreur à la fenêtre parente
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'outlook_callback',
            error: error,
            error_description: errorDescription
          },
          window.location.origin
        )
      }
      window.close()
      return
    }

    if (code && state) {
      // Envoyer le code et state à la fenêtre parente
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'outlook_callback',
            code: code,
            state: state
          },
          window.location.origin
        )
      }

      // Fermer la popup après 1 seconde
      setTimeout(() => {
        window.close()
      }, 1000)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Authentification en cours...</h2>
        <p className="text-sm text-gray-500 mt-2">
          Vous allez être redirigé automatiquement.
        </p>
      </div>
    </div>
  )
}
