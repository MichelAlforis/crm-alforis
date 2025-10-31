'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface NewsletterModalProps {
  isOpen: boolean
  defaultEmail?: string
  onClose: () => void
  onSubscribe: (email: string) => Promise<void>
}

export function NewsletterModal({ isOpen, defaultEmail, onClose, onSubscribe }: NewsletterModalProps) {
  const [email, setEmail] = useState(defaultEmail || '')
  const [isSubscribing, setIsSubscribing] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    setIsSubscribing(true)
    try {
      await onSubscribe(email)
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          S&apos;inscrire à la newsletter
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          Recevez chaque mois les dernières actualités et améliorations du
          CRM directement dans votre boîte mail.
        </p>
        <div className="mt-4">
          <label
            htmlFor="newsletter-email"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Votre adresse email
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubscribing) {
                handleSubmit()
              }
            }}
            disabled={isSubscribing}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubscribing}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubscribing}
            className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubscribing && <Loader2 className="h-4 w-4 animate-spin" />}
            S&apos;inscrire
          </button>
        </div>
      </div>
    </div>
  )
}
