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
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-toast px-4 py-2 rounded-radius-md shadow-shadow-lg flex items-center gap-2 animate-fade-in ${
        isOnline
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-warning/10 text-warning border border-warning/20'
      }`}
      role="alert"
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">De retour en ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            Mode hors ligne - Les données seront synchronisées
          </span>
        </>
      )}
    </div>
  )
}
