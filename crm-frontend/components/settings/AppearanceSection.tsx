'use client'

import { Palette } from 'lucide-react'

interface AppearanceSectionProps {
  preferredTheme: 'system' | 'clair' | 'sombre'
  onThemeChange: (theme: 'system' | 'clair' | 'sombre') => void
  onReset: () => void
  onSave: () => void
}

export function AppearanceSection({
  preferredTheme,
  onThemeChange,
  onReset,
  onSave,
}: AppearanceSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6 text-purple-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Apparence &amp; confort
          </h2>
          <p className="text-sm text-gray-500">
            Adaptez l&apos;interface à votre environnement de travail.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <label
            htmlFor="theme"
            className="text-xs font-semibold uppercase text-gray-500"
          >
            Thème
          </label>
          <select
            id="theme"
            value={preferredTheme}
            onChange={(event) =>
              onThemeChange(event.target.value as typeof preferredTheme)
            }
            className="mt-2 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="system">Automatique (selon l&apos;appareil)</option>
            <option value="clair">Mode clair</option>
            <option value="sombre">Mode sombre</option>
          </select>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
          Le mode sombre est en bêta et sera synchronisé avec les préférences
          de vos collaborateurs lors du prochain sprint.
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <p className="text-sm text-gray-500">
          Ces réglages seront bientôt synchronisés avec l&apos;API. Pour le
          moment ils sont stockés localement.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800"
          >
            Réinitialiser
          </button>
          <button
            onClick={onSave}
            className="rounded-lg border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </section>
  )
}
