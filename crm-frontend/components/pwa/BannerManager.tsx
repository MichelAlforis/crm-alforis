'use client'

/**
 * Unified Banner Manager
 *
 * Gère tous les popups/banners de manière centralisée avec :
 * - Un seul popup à la fois
 * - Système de priorités
 * - Délais entre chaque popup
 * - État persisté dans localStorage
 */

import React, { useEffect, useState } from 'react'
import { Bell, Download, X, Sparkles } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

type BannerType = 'pwa-install' | 'push-notifications' | 'onboarding'

interface Banner {
  id: BannerType
  priority: number
  title: string
  description: string
  icon: React.ReactNode
  actionLabel: string
  dismissLabel: string
  onAction: () => Promise<void> | void
  onDismiss: () => void
  shouldShow: () => boolean
}

export function BannerManager() {
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [queue, setQueue] = useState<Banner[]>([])

  // Hooks
  const { permission, isSubscribed, subscribe } = usePushNotifications()

  // Onboarding callback (sera géré par OnboardingTour directement)
  // Onboarding callback removed

  // État PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)

  // Capturer l'événement PWA install
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Vérifier si PWA déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Définir tous les banners possibles
  const allBanners: Banner[] = [
    // 1. PWA Installation (priorité haute)
    {
      id: 'pwa-install',
      priority: 1,
      title: 'Installer l\'application',
      description: 'Accédez rapidement au CRM depuis votre écran d\'accueil.',
      icon: <Download className="w-5 h-5 text-blue-600 dark:text-blue-300" />,
      actionLabel: 'Installer',
      dismissLabel: 'Plus tard',
      onAction: async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt()
          const { outcome } = await deferredPrompt.userChoice
          if (outcome === 'accepted') {
            localStorage.setItem('pwa-install-dismissed', 'true')
            setDeferredPrompt(null)
            showNextBanner()
          }
        }
      },
      onDismiss: () => {
        localStorage.setItem('pwa-install-dismissed', 'true')
        showNextBanner()
      },
      shouldShow: () => {
        return (
          !isPWAInstalled &&
          deferredPrompt !== null &&
          !localStorage.getItem('pwa-install-dismissed')
        )
      },
    },

    // 2. Push Notifications (priorité moyenne)
    {
      id: 'push-notifications',
      priority: 2,
      title: 'Activer les notifications',
      description: 'Recevez des alertes pour les nouvelles tâches et rappels.',
      icon: <Bell className="w-5 h-5 text-blue-600 dark:text-blue-300" />,
      actionLabel: 'Activer',
      dismissLabel: 'Plus tard',
      onAction: async () => {
        setIsLoading(true)
        const success = await subscribe()
        setIsLoading(false)
        if (success) {
          localStorage.setItem('push-notifications-dismissed', 'true')
          showNextBanner()
        }
      },
      onDismiss: () => {
        localStorage.setItem('push-notifications-dismissed', 'true')
        showNextBanner()
      },
      shouldShow: () => {
        return (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          permission !== 'denied' &&
          !isSubscribed &&
          !localStorage.getItem('push-notifications-dismissed')
        )
      },
    },

    // 3. Onboarding Tour (priorité basse)
    {
      id: 'onboarding',
      priority: 3,
      title: 'Découvrir le CRM',
      description: 'Une visite guidée rapide pour commencer (2 min).',
      icon: <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-300" />,
      actionLabel: 'Démarrer la visite',
      dismissLabel: 'Ignorer',
      onAction: () => {
        localStorage.setItem('onboarding-dismissed', 'true')
        setCurrentBanner(null)
        // Déclencher l'événement pour OnboardingTour
        window.dispatchEvent(new CustomEvent('start-onboarding'))
      },
      onDismiss: () => {
        localStorage.setItem('onboarding-dismissed', 'true')
        showNextBanner()
      },
      shouldShow: () => {
        const hasCompletedOnboarding = localStorage.getItem('onboarding-completed') === 'true'
        const hasDismissed = localStorage.getItem('onboarding-dismissed') === 'true'
        return !hasCompletedOnboarding && !hasDismissed
      },
    },
  ]

  // Construire la queue au montage et à chaque changement
  useEffect(() => {
    const availableBanners = allBanners
      .filter((banner) => banner.shouldShow())
      .sort((a, b) => a.priority - b.priority)

    setQueue(availableBanners)

    // Afficher le premier banner après 2 secondes
    if (availableBanners.length > 0 && !currentBanner) {
      setTimeout(() => {
        setCurrentBanner(availableBanners[0])
      }, 2000)
    }
  }, [deferredPrompt, isSubscribed, permission, isPWAInstalled])

  // Afficher le banner suivant dans la queue
  const showNextBanner = () => {
    setCurrentBanner(null)

    setTimeout(() => {
      const remainingBanners = allBanners
        .filter((banner) => banner.shouldShow())
        .sort((a, b) => a.priority - b.priority)

      if (remainingBanners.length > 0) {
        setCurrentBanner(remainingBanners[0])
      }
    }, 1000) // Délai de 1 seconde entre chaque banner
  }

  // Ne rien afficher si pas de banner
  if (!currentBanner) {
    return null
  }

  return (
    <div className="fixed bottom-24 right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Bouton fermer */}
        <button
          onClick={currentBanner.onDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icône */}
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            {currentBanner.icon}
          </div>

          {/* Contenu */}
          <div className="flex-1 pr-6">
            <h3 className="font-semibold text-sm mb-1">
              {currentBanner.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              {currentBanner.description}
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={currentBanner.onAction}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Chargement...' : currentBanner.actionLabel}
              </button>
              <button
                onClick={currentBanner.onDismiss}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {currentBanner.dismissLabel}
              </button>
            </div>

            {/* Indicateur de queue */}
            {queue.length > 1 && (
              <div className="flex gap-1 mt-3 justify-center">
                {queue.map((banner) => (
                  <div
                    key={banner.id}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      banner.id === currentBanner.id
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
