'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  AlertTriangle,
  Bell,
  BellRing,
  Building,
  CheckCheck,
  Clock,
  DownloadCloud,
  Mail,
  MessageSquare,
  PackageCheck,
  X,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import type { NotificationItem } from '@/lib/types'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface NotificationBellProps {
  className?: string
  buttonClassName?: string
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-text-secondary dark:bg-slate-700/80 dark:text-slate-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/25 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/25 dark:text-red-300',
}

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  task_due: AlertTriangle,
  task_assigned: CheckCheck,
  task_completed: CheckCheck,
  interaction_new: MessageSquare,
  interaction_assigned: MessageSquare,
  mandat_signed: PackageCheck,
  mandat_expired: AlertTriangle,
  mandat_expiring_soon: Clock,
  organisation_created: Building,
  organisation_updated: Building,
  organisation_assigned: Building,
  pipeline_moved: BellRing,
  pipeline_stuck: AlertTriangle,
  mention: Mail,
  comment_reply: MessageSquare,
  export_ready: DownloadCloud,
  import_completed: DownloadCloud,
  system: Bell,
}

const MAX_VISIBLE = 8

export default function NotificationBell({ className, buttonClassName }: NotificationBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadCount,
    isConnecting,
    isConnected,
    lastError,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications()

  const visibleNotifications = useMemo(
    () => notifications.slice(0, MAX_VISIBLE),
    [notifications]
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleNotificationClick = useCallback((notification: NotificationItem) => {
    markAsRead(notification.id)
    setIsOpen(false)
    if (notification.link) {
      router.push(notification.link)
    }
  }, [markAsRead, router])

  const statusDotClass = useMemo(() => {
    if (isConnecting) return 'bg-amber-400'
    if (isConnected) return 'bg-emerald-500'
    if (lastError) return 'bg-red-500'
    return 'bg-border dark:bg-slate-700'
  }, [isConnected, isConnecting, lastError])

  const statusLabel = useMemo(() => {
    if (isConnecting) return 'Connexion…'
    if (isConnected) return 'Connecté'
    if (lastError) return 'Erreur de connexion'
    return 'Déconnecté'
  }, [isConnected, isConnecting, lastError])

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx(
          'relative inline-flex items-center justify-center rounded-xl border border-border bg-foreground px-3 py-2 text-text-secondary transition-all duration-200',
          'hover:border-primary/40 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:border-blue-500/50 dark:hover:text-blue-400 dark:hover:bg-slate-700/80',
          buttonClassName
        )}
        aria-label="Ouvrir les notifications"
        title={statusLabel}
      >
        <Bell className={clsx('h-5 w-5', unreadCount > 0 && 'animate-bounce')} aria-hidden />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-border bg-foreground shadow-2xl ring-1 ring-black/5 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className={clsx('h-2.5 w-2.5 rounded-full', statusDotClass)} aria-hidden />
              <p className="text-sm font-semibold text-text-primary dark:text-slate-100">Notifications</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle size="sm" className="hidden sm:inline-flex bg-muted text-text-secondary hover:bg-muted/80 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-muted hover:text-text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <BellRing className="h-8 w-8 text-text-muted dark:text-slate-400" aria-hidden />
                <p className="text-sm font-medium text-text-secondary dark:text-slate-300">Pas encore de notifications</p>
                <p className="text-xs text-text-muted dark:text-slate-400">
                  Elles apparaîtront ici dès qu'un évènement important survient.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60 dark:divide-slate-700">
                {visibleNotifications.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type] ?? Bell
                  const priorityClass = PRIORITY_STYLES[notification.priority] ?? PRIORITY_STYLES.normal

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={clsx(
                          'w-full px-4 py-3 text-left transition-all duration-200 focus:outline-none',
                          'hover:bg-blue-50 focus:bg-blue-50 dark:hover:bg-slate-700/80 dark:focus:bg-slate-700/80',
                          !notification.is_read
                            ? 'bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-500/15 dark:to-transparent'
                            : 'bg-foreground dark:bg-slate-800'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-text-primary dark:text-slate-100">{notification.title}</p>
                              <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', priorityClass)}>
                                {notification.priority}
                              </span>
                            </div>
                            {notification.message && (
                              <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">
                                {notification.message}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              <span>{formatRelativeTime(notification.created_at)}</span>
                              {!notification.is_read && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/25 dark:text-blue-300">
                                  Nouveau
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                markAllAsRead()
                setIsOpen(false)
              }}
              className="text-xs font-semibold text-primary transition-colors hover:text-primary/80 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Tout marquer comme lu
            </button>
            <button
              type="button"
              onClick={() => {
                clearNotifications()
                setIsOpen(false)
              }}
              className="text-xs text-text-muted transition-colors hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Date inconnue'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Date inconnue'

  const now = Date.now()
  const diffMs = date.getTime() - now
  const diffSeconds = Math.round(diffMs / 1000)

  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['years', 60 * 60 * 24 * 365],
    ['months', 60 * 60 * 24 * 30],
    ['weeks', 60 * 60 * 24 * 7],
    ['days', 60 * 60 * 24],
    ['hours', 60 * 60],
    ['minutes', 60],
    ['seconds', 1],
  ]

  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'seconds') {
      const value = Math.round(diffSeconds / secondsInUnit)
      return rtf.format(value, unit)
    }
  }

  return 'À l’instant'
}
