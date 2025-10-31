'use client'

import { useState } from 'react'
import { AlertCircle, Shield, X } from 'lucide-react'
import clsx from 'clsx'

interface OutlookConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function OutlookConsentModal({ isOpen, onClose, onConfirm }: OutlookConsentModalProps) {
  const [consent1, setConsent1] = useState(false)
  const [consent2, setConsent2] = useState(false)
  const [consent3, setConsent3] = useState(false)

  const allConsentsGiven = consent1 && consent2 && consent3

  const handleConfirm = () => {
    if (allConsentsGiven) {
      onConfirm()
      // Reset pour la prochaine fois
      setConsent1(false)
      setConsent2(false)
      setConsent3(false)
    }
  }

  const handleClose = () => {
    setConsent1(false)
    setConsent2(false)
    setConsent3(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-slate-700 p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Consentement RGPD – Intégration Outlook
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Protection des données personnelles
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-gray-600 dark:text-slate-400 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Avertissement important */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Attention : périmètre étendu</p>
              <p>
                En connectant Outlook, vous autorisez l'analyse de <strong>toutes vos signatures d'emails professionnelles</strong>.
                Cela peut inclure des contacts de votre entreprise, partenaires et clients.
              </p>
            </div>
          </div>

          {/* Texte RGPD officiel */}
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-5 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
            <p className="mb-3">
              En connectant Outlook, vous autorisez l'analyse de vos signatures d'emails afin d'enrichir
              automatiquement les fiches contacts professionnelles dans le CRM.
            </p>
            <p className="mb-3">
              <strong>Aucune donnée personnelle privée ni contenu des messages ne sera extrait.</strong>
            </p>
            <p>
              Vous pouvez désactiver l'intégration à tout moment et demander la suppression complète
              des données collectées.
            </p>
          </div>

          {/* Ce qui est collecté */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
              📌 Données collectées (signatures uniquement)
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Email professionnel (ex: alice@acme.com)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Téléphone professionnel (ex: +33 6 12 34 56 78)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Fonction (ex: Directeur Commercial)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Entreprise (ex: ACME Corp)</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
              🚫 Ce qui n'est PAS collecté
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-600">✗</span>
                <span>Contenu des messages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600">✗</span>
                <span>Pièces jointes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600">✗</span>
                <span>Conversations privées</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600">✗</span>
                <span>Données personnelles sensibles</span>
              </li>
            </ul>
          </div>

          {/* Checklist de consentement */}
          <div className="space-y-3 border-t border-gray-200 dark:border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">
              Consentement requis (cochez les 3 cases)
            </h3>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent1}
                onChange={(e) => setConsent1(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:hover:text-white dark:text-slate-100">
                J'accepte que mes signatures professionnelles soient analysées pour enrichir les contacts du CRM
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent2}
                onChange={(e) => setConsent2(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:hover:text-white dark:text-slate-100">
                Je comprends que seules les informations strictement professionnelles (email, téléphone, fonction, entreprise) sont traitées
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent3}
                onChange={(e) => setConsent3(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:hover:text-white dark:text-slate-100">
                Je suis autorisé(e) à synchroniser les contacts professionnels de mon organisation
              </span>
            </label>
          </div>

          {/* Sécurité */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">
            <p className="font-semibold mb-1">🔒 Sécurité des données</p>
            <p>
              Vos tokens OAuth sont chiffrés (AES-256) en base de données. Aucun mot de passe Outlook
              n'est stocké. Vous pouvez révoquer l'accès à tout moment.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 transition"
          >
            Annuler
          </button>

          <button
            onClick={handleConfirm}
            disabled={!allConsentsGiven}
            className={clsx(
              'px-6 py-2 rounded-lg text-sm font-semibold transition',
              allConsentsGiven
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {allConsentsGiven ? 'Confirmer et connecter' : 'Veuillez cocher les 3 cases'}
          </button>
        </div>
      </div>
    </div>
  )
}
