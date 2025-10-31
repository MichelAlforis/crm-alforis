'use client'

import { Bell, Calendar, Smartphone, Mail } from 'lucide-react'

type NotificationOptionKey =
  | 'dailyDigest'
  | 'taskReminders'
  | 'investorUpdates'
  | 'calendarSync'

interface NotificationsSectionProps {
  notificationOptions: Record<NotificationOptionKey, boolean>
  onToggle: (key: NotificationOptionKey) => void
}

export function NotificationsSection({
  notificationOptions,
  onToggle,
}: NotificationsSectionProps) {
  const options = [
    {
      key: 'dailyDigest' as NotificationOptionKey,
      title: 'Résumé quotidien',
      description:
        'Recevoir chaque matin un récapitulatif des tâches et deals à traiter.',
      icon: Calendar,
    },
    {
      key: 'taskReminders' as NotificationOptionKey,
      title: 'Relances tâches',
      description:
        'Notifications push et email pour les tâches à échéance proche.',
      icon: Smartphone,
    },
    {
      key: 'investorUpdates' as NotificationOptionKey,
      title: 'Actualités investisseurs',
      description:
        'Alertes sur les mouvements clés des investisseurs suivis.',
      icon: Mail,
    },
    {
      key: 'calendarSync' as NotificationOptionKey,
      title: 'Synchronisation agenda',
      description:
        'Envoi automatique des interactions dans votre calendrier.',
      icon: Calendar,
    },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-amber-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Notifications
          </h2>
          <p className="text-sm text-gray-500">
            Choisissez les alertes qui vous aident à rester à jour.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {options.map(({ key, title, description, icon: Icon }) => (
          <li
            key={key}
            className="rounded-xl border border-gray-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60"
          >
            <label className="flex cursor-pointer items-start gap-4">
              <span className="mt-1">
                <input
                  type="checkbox"
                  checked={notificationOptions[key]}
                  onChange={() => onToggle(key)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-gray-900 dark:text-slate-100">{title}</span>
                </span>
                <span className="text-sm text-gray-500">{description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
