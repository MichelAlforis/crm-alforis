'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [showOnlineMessage, setShowOnlineMessage] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      // Afficher temporairement le message "De retour en ligne"
      setShowOnlineMessage(true)
      const timer = setTimeout(() => {
        setShowOnlineMessage(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (isOnline && !showOnlineMessage) {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-6 py-4 shadow-2xl flex items-center justify-center gap-3 animate-slide-down ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-yellow-500 text-gray-900 dark:text-slate-100'
      }`}
      role="alert"
    >
      {isOnline ? (
        <>
          <Wifi className="w-6 h-6" />
          <span className="text-base font-semibold">
            ✅ Connexion rétablie - Synchronisation en cours...
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-6 h-6" />
          <span className="text-base font-semibold">
            ⚠️ Mode hors ligne - Certaines fonctionnalités sont limitées
          </span>
        </>
      )}
    </div>
  )
}
