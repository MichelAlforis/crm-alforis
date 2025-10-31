'use client'

import { Activity, Download } from 'lucide-react'

interface SecurityEvent {
  id: string
  context: string
  detail: string
  time: string
}

interface SecurityLogSectionProps {
  securityEvents: SecurityEvent[]
  onDownloadLog: () => void
}

export function SecurityLogSection({ securityEvents, onDownloadLog }: SecurityLogSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-emerald-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Journal de sécurité
          </h2>
          <p className="text-sm text-gray-500">
            Historique des connexions, exports et actions sensibles sur les 30
            derniers jours.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Événement</th>
              <th className="px-4 py-3">Détails</th>
              <th className="px-4 py-3">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:bg-slate-900">
            {securityEvents.map((event) => (
              <tr key={event.id} className="transition hover:bg-emerald-50/60">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                  {event.context}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{event.detail}</td>
                <td className="px-4 py-3 text-gray-500">{event.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-gray-500">
        <p>
          Les journaux complets seront exportables (CSV, JSON) lorsque la
          télémétrie back-end sera branchée.
        </p>
        <button
          onClick={onDownloadLog}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-emerald-600 transition hover:bg-emerald-50"
        >
          <Download className="h-3.5 w-3.5" />
          Télécharger le journal
        </button>
      </div>
    </section>
  )
}
