'use client'

import { Card } from '@/components/shared'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import type { PersonDetail } from '@/lib/types'

interface PersonInfoCardProps {
  person: PersonDetail
}

export function PersonInfoCard({ person }: PersonInfoCardProps) {
  const countryValue = person?.country_code || ''
  const countryLabel =
    countryValue
      ? COUNTRY_OPTIONS.find((option) => option.value === countryValue)?.label || countryValue
      : '-'
  const languageValue = person?.language || ''
  const languageLabel =
    languageValue
      ? LANGUAGE_OPTIONS.find((option) => option.value === languageValue)?.label || languageValue
      : '-'

  return (
    <Card padding="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Email personnel</p>
          <p className="font-medium text-sm">{person.personal_email || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Mobile</p>
          <p className="font-medium text-sm">{person.personal_phone || '-'}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Statut emails marketing</p>
          {person.email_unsubscribed ? (
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
          <p className="text-sm text-gray-600 dark:text-slate-400">Pays</p>
          <p className="font-medium text-sm">{countryLabel}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Langue préférée</p>
          <p className="font-medium text-sm">{languageLabel}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">LinkedIn</p>
          {person.linkedin_url ? (
            <a
              href={person.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bleu hover:underline text-sm"
            >
              Voir le profil
            </a>
          ) : (
            <p className="text-sm text-gray-500">-</p>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Notes</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {person.notes || '-'}
          </p>
        </div>
      </div>
    </Card>
  )
}
