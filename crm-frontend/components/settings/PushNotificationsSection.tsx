'use client'

import { Smartphone, CheckCircle2, Shield, Bell } from 'lucide-react'

interface PushNotificationsSectionProps {
  isPushSubscribed: boolean
  pushPermission: NotificationPermission
  isPushLoading: boolean
  pushError: string | null
  onSubscribe: () => Promise<boolean>
  onUnsubscribe: () => Promise<boolean>
  onShowToast: (options: { type: string; title: string; message?: string }) => void
}

export function PushNotificationsSection({
  isPushSubscribed,
  pushPermission,
  isPushLoading,
  pushError,
  onSubscribe,
  onUnsubscribe,
  onShowToast,
}: PushNotificationsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-blue-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Notifications Push
          </h2>
          <p className="text-sm text-gray-500">
            Recevez des notifications en temps réel sur votre appareil.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Statut actuel */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-800 px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-gray-500">
              Statut
            </dt>
            <dd className="mt-2 flex items-center gap-2">
              {isPushSubscribed ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">
                    Notifications activées
                  </span>
                </>
              ) : pushPermission === 'denied' ? (
                <>
                  <Shield className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-700">
                    Permission refusée
                  </span>
                </>
              ) : (
                <>
                  <Bell className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                    Non activé
                  </span>
                </>
              )}
            </dd>
            {pushPermission === 'denied' && (
              <p className="mt-2 text-xs text-red-600">
                Vous avez bloqué les notifications. Pour les réactiver, allez dans les paramètres de votre navigateur :
                Chrome → Paramètres → Confidentialité et sécurité → Paramètres des sites → Notifications
              </p>
            )}
          </div>

          {/* Afficher l'erreur s'il y en a une */}
          {pushError && !isPushSubscribed && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{pushError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isPushSubscribed ? (
              <button
                onClick={async () => {
                  const success = await onSubscribe()
                  if (success) {
                    onShowToast({
                      type: 'success',
                      title: 'Notifications activées',
                      message: 'Vous recevrez désormais des notifications push.',
                    })
                  } else if (pushPermission === 'denied') {
                    onShowToast({
                      type: 'error',
                      title: 'Permission refusée',
                      message: 'Veuillez autoriser les notifications dans les paramètres de votre navigateur.',
                    })
                  }
                }}
                disabled={isPushLoading || pushPermission === 'denied'}
                className="flex-1 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPushLoading ? 'Activation...' : 'Activer les notifications'}
              </button>
            ) : (
              <button
                onClick={async () => {
                  const success = await onUnsubscribe()
                  if (success) {
                    onShowToast({
                      type: 'info',
                      title: 'Notifications désactivées',
                      message: 'Vous ne recevrez plus de notifications push.',
                    })
                  }
                }}
                disabled={isPushLoading}
                className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPushLoading ? 'Désactivation...' : 'Désactiver les notifications'}
              </button>
            )}
          </div>
        </div>

        {/* Info à droite */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 h-fit">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Comment ça marche ?</h3>
          <ul className="text-xs text-blue-700 space-y-1.5">
            <li>• Les notifications fonctionnent même quand l&apos;app est fermée</li>
            <li>• Vous recevrez des alertes pour les tâches et rappels</li>
            <li>• Cliquez sur une notification pour ouvrir l&apos;app directement</li>
            <li>• Vous pouvez désactiver à tout moment</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
