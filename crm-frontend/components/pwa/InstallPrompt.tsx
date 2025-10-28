'use client'
import { logger } from '@/lib/logger'

import { useEffect, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Détecter si déjà installé
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    // Écouter l'événement beforeinstallprompt (Chrome, Edge, etc.)
    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)

      // Vérifier si l'utilisateur a déjà refusé
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        // Afficher après 30 secondes
        setTimeout(() => {
          setShowPrompt(true)
        }, 30000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Afficher le prompt natif
    deferredPrompt.prompt()

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      logger.log('PWA installée')
    }

    // Réinitialiser
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Ne pas afficher si déjà installé
  if (isStandalone) {
    return null
  }

  // Message pour iOS
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-toast bg-background border border-border rounded-radius-lg shadow-shadow-lg p-4 animate-fade-in">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-radius-md flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-text-primary mb-1">
              Installer l'application
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              Pour une meilleure expérience, installez TPM CRM sur votre écran d'accueil.
            </p>
            <div className="text-xs text-text-muted space-y-1">
              <p>1. Appuyez sur <span className="font-medium">Partager</span> ⬆️</p>
              <p>2. Sélectionnez <span className="font-medium">"Sur l'écran d'accueil"</span></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Prompt pour Android/Desktop
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-toast bg-background border border-border rounded-radius-lg shadow-shadow-lg p-4 animate-fade-in">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-radius-md flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-text-primary mb-1">
              Installer l'application
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              Installez TPM CRM pour un accès rapide et une expérience optimale.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="btn-primary btn-sm flex-1"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="btn-ghost btn-sm"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
