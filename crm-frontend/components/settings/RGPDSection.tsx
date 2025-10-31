'use client'

import { Lock, Database, Shield } from 'lucide-react'

interface RGPDSectionProps {
  isAdmin?: boolean
}

export function RGPDSection({ isAdmin }: RGPDSectionProps) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Lock className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Mes données personnelles (RGPD)
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Gérez vos données conformément au Règlement Général sur la Protection des Données
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export My Data */}
        <a
          href="/dashboard/settings/rgpd/my-data"
          className="group rounded-xl border border-blue-200 bg-white dark:bg-slate-900 p-4 transition hover:border-blue-400 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Exporter/Supprimer mes données</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Téléchargez toutes vos données ou exercez votre droit à l'oubli (Articles 15 & 17)
              </p>
            </div>
          </div>
        </a>

        {/* Access Logs (Admin only) */}
        {isAdmin && (
          <a
            href="/dashboard/settings/rgpd/access-logs"
            className="group rounded-xl border border-purple-200 bg-white dark:bg-slate-900 p-4 transition hover:border-purple-400 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">Logs d'accès CNIL</h3>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">Admin</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Traçabilité des accès aux données personnelles (conformité CNIL)
                </p>
              </div>
            </div>
          </a>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
        <p className="text-xs text-blue-800">
          <strong>Vos droits RGPD:</strong> Droit d'accès, droit à la portabilité, droit à l'oubli, droit de rectification.
          Pour toute question, contactez notre DPO à <a href="mailto:dpo@alforis.fr" className="underline hover:text-blue-900">dpo@alforis.fr</a>
        </p>
      </div>
    </section>
  )
}
