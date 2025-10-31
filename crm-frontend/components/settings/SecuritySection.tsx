'use client'

import { Shield, KeyRound, Smartphone } from 'lucide-react'

type SecurityOptionKey = 'twoFactor' | 'loginAlerts'

interface SecuritySectionProps {
  securityOptions: Record<SecurityOptionKey, boolean>
  onToggle: (key: SecurityOptionKey) => void
  onConfigure: () => void
}

export function SecuritySection({
  securityOptions,
  onToggle,
  onConfigure,
}: SecuritySectionProps) {
  const options = [
    {
      key: 'twoFactor' as SecurityOptionKey,
      title: 'Double authentification',
      description:
        'Ajoutez une vérification par SMS ou application pour chaque connexion.',
      icon: KeyRound,
    },
    {
      key: 'loginAlerts' as SecurityOptionKey,
      title: 'Alertes de connexion',
      description:
        'Recevoir un email lorsqu\'une connexion est détectée sur un nouvel appareil.',
      icon: Smartphone,
    },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-emerald-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Sécurité
          </h2>
          <p className="text-sm text-gray-500">
            Renforcez la protection de votre compte et définissez les
            alertes critiques.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {options.map(({ key, title, description, icon: Icon }) => (
          <div
            key={key}
            className="rounded-xl border border-gray-100 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/60"
          >
            <label className="flex cursor-pointer items-start gap-4">
              <span className="mt-1">
                <input
                  type="checkbox"
                  checked={securityOptions[key]}
                  onChange={() => onToggle(key)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-gray-900 dark:text-slate-100">{title}</span>
                </span>
                <span className="text-sm text-gray-500">{description}</span>
              </span>
            </label>
          </div>
        ))}
      </div>

      <button
        onClick={onConfigure}
        className="mt-6 w-full rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
      >
        Configurer maintenant
      </button>
    </div>
  )
}
