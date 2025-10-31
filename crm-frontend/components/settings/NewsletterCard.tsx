'use client'

import { Mail } from 'lucide-react'

interface NewsletterCardProps {
  onSubscribe: () => void
}

export function NewsletterCard({ onSubscribe }: NewsletterCardProps) {
  return (
    <aside className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-indigo-500" />
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">
            Nouveautés produit
          </h3>
          <p className="text-xs text-indigo-700/80">
            Recevez un résumé mensuel des améliorations CRM.
          </p>
        </div>
      </div>
      <button
        onClick={onSubscribe}
        className="mt-4 inline-flex items-center justify-center rounded-full border border-indigo-500 px-4 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-500 hover:text-white"
      >
        S&apos;inscrire à la newsletter
      </button>
    </aside>
  )
}
