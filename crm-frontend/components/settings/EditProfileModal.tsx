'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface EditProfileModalProps {
  isOpen: boolean
  userName?: string
  onClose: () => void
  onSave: (data: { fullName: string; currentPassword: string; newPassword: string }) => Promise<void>
}

export function EditProfileModal({ isOpen, userName, onClose, onSave }: EditProfileModalProps) {
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({ fullName, currentPassword, newPassword })
      // Reset fields on success
      setFullName('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setFullName('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          Modifier le profil
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          Modifiez votre nom complet et/ou votre mot de passe.
        </p>

        <div className="mt-6 space-y-4">
          {/* Nom complet */}
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Nom complet
            </label>
            <input
              id="full-name"
              type="text"
              placeholder={userName || "Votre nom complet"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSaving}
              className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Laissez vide pour ne pas modifier
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-2 text-gray-500 uppercase font-semibold">Changer le mot de passe (optionnel)</span>
            </div>
          </div>

          {/* Mot de passe actuel */}
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Mot de passe actuel
            </label>
            <input
              id="current-password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSaving}
              className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
            />
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="Minimum 6 caractères"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSaving}
              className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
            />
          </div>

          {/* Confirmer nouveau mot de passe */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Retapez le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSaving && newPassword === confirmPassword) {
                  handleSave()
                }
              }}
              disabled={isSaving}
              className="mt-2 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 dark:bg-slate-800 disabled:cursor-not-allowed"
            />
          </div>

          {newPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600">
              ⚠️ Les mots de passe ne correspondent pas
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (newPassword && newPassword !== confirmPassword)}
            className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
