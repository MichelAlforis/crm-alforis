'use client'

/**
 * PWA Install Prompt Component
 *
 * Handles PWA installation prompts for:
 * - Android Chrome (beforeinstallprompt event)
 * - iOS Safari (manual instructions)
 *
 * Tests covered:
 * - 8.3: Prompt installation affiché (Android)
 * - 8.4: Installation manuelle (iOS Safari)
 * - 8.5: Icône app affichée sur écran d'accueil
 */

import React, { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isInStandaloneMode =
      ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches

    setIsStandalone(isInStandaloneMode)

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iOS = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iOS)

    // Check if user already dismissed the prompt (localStorage)
    const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    setDismissed(hasBeenDismissed)

    // Listen for beforeinstallprompt (Android Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)

      // Show prompt after 3 seconds if not dismissed
      if (!hasBeenDismissed) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App successfully installed')
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice

    console.log(`[PWA] User response: ${outcome}`)

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  const handleIOSInstructions = () => {
    setShowPrompt(true)
  }

  // Don't show if already installed or dismissed
  if (isStandalone || dismissed || !showPrompt) {
    return null
  }

  // iOS Safari - Show instructions
  if (isIOS && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Installer l'application</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
            <p>Pour installer cette app sur votre iPhone/iPad :</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Appuyez sur <Share className="w-3 h-3 inline mx-1" /> (Partager)
              </li>
              <li>Sélectionnez "Sur l'écran d'accueil"</li>
              <li>Appuyez sur "Ajouter"</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // Android/Desktop - Show install button
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Installer TPM CRM</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
            Installez l'application pour un accès rapide et une expérience optimale,
            même hors ligne.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
