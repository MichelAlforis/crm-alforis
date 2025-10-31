'use client'

import { Card } from '@/components/shared'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import type { OrganisationDetail } from '@/lib/types'

interface OrganisationInfoCardProps {
  organisation: OrganisationDetail
}

export function OrganisationInfoCard({ organisation }: OrganisationInfoCardProps) {
  const getCountryLabel = (code?: string | null) => {
    if (!code) return '-'
    return COUNTRY_OPTIONS.find((opt) => opt.value === code)?.label || code
  }

  const getLanguageLabel = (lang?: string | null) => {
    if (!lang) return '-'
    return LANGUAGE_OPTIONS.find((opt) => opt.value === lang)?.label || lang
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Email</p>
          <p className="font-medium">{organisation.email || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Téléphone</p>
          <p className="font-medium">{organisation.main_phone || '-'}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Statut emails marketing</p>
          {organisation.email_unsubscribed ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                🚫 Désinscrit des emails marketing
              </span>
              <span className="text-xs text-gray-500">
                (Conformité RGPD - Aucun email ne sera envoyé)
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✅ Abonné aux emails marketing
            </span>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Site web</p>
          <p className="font-medium">
            {organisation.website ? (
              <a
                href={organisation.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bleu hover:underline"
              >
                {organisation.website}
              </a>
            ) : (
              '-'
            )}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Adresse</p>
          <p className="font-medium">{organisation.address || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Pays</p>
          <p className="font-medium">{getCountryLabel(organisation.country_code)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Langue</p>
          <p className="font-medium">{getLanguageLabel(organisation.language)}</p>
        </div>
      </div>
    </Card>
  )
}
