'use client'

import { CheckCircle2 } from 'lucide-react'

interface ProfileSectionProps {
  userEmail?: string
  onEditProfile: () => void
}

export function ProfileSection({ userEmail, onEditProfile }: ProfileSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Profil &amp; compte
          </h2>
          <p className="text-sm text-gray-500">
            Informations générales utilisées pour personnaliser vos accès.
          </p>
        </div>
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      </div>

      <dl className="mt-6 grid gap-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3">
          <dt className="text-xs font-semibold uppercase text-gray-500">
            Adresse e-mail
          </dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
            {userEmail || 'utilisateur@example.com'}
          </dd>
          <p className="mt-1 text-xs text-gray-500">
            Utilisée pour vous connecter et recevoir les notifications clés.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3">
          <dt className="text-xs font-semibold uppercase text-gray-500">
            Rôle
          </dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
            Administrateur
          </dd>
          <p className="mt-1 text-xs text-gray-500">
            Les permissions fines arrivent prochainement pour les équipes.
          </p>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onEditProfile}
          className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Modifier le profil
        </button>
      </div>
    </div>
  )
}
