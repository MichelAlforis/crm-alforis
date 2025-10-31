'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from "@/lib/constants"
import { useToast } from '@/hooks/useToast'

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      showToast({
        type: 'error',
        title: 'Token manquant',
        message: 'Lien de réinitialisation invalide',
      })
      router.push(ROUTES.AUTH.LOGIN)
    } else {
      setToken(tokenParam)
    }
  }, [searchParams, router, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      showToast({
        type: 'error',
        title: 'Mot de passe trop court',
        message: 'Le mot de passe doit contenir au moins 6 caractères',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Les mots de passe ne correspondent pas',
      })
      return
    }

    if (!token) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Token manquant',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        showToast({
          type: 'success',
          title: 'Succès',
          message: 'Votre mot de passe a été réinitialisé',
        })
        setTimeout(() => {
          router.push(ROUTES.AUTH.LOGIN)
        }, 2000)
      } else {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: data.detail || 'Token invalide ou expiré',
        })
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Une erreur est survenue. Veuillez réessayer.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
          style={{ willChange: 'auto' }}
        >
          <source src="/Video_auth_optimized.webm" type="video/webm" />
          <source src="/Video_auth_optimized.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.6,
          }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Card */}
          <div
            className="relative rounded-[20px] overflow-hidden"
            style={{
              backdropFilter: 'blur(12px) saturate(180%)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.90) 100%)',
              border: '1px solid rgba(227, 159, 112, 0.2)',
              boxShadow: `
                0 0 0 1px rgba(255, 255, 255, 0.8),
                0 8px 32px rgba(0, 0, 0, 0.3),
                0 16px 64px rgba(0, 0, 0, 0.2),
                0 24px 96px rgba(227, 159, 112, 0.15)
              `,
            }}
          >
            {/* Content */}
            <div className="relative p-8 md:p-10">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-8"
              >
                <Link href="/auth/login" className="inline-block transition-opacity hover:opacity-80">
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-lg"
                  >
                    <defs>
                      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#ea580c', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <rect width="64" height="64" rx="16" fill="url(#logoGrad)" />
                    <circle cx="20" cy="20" r="4" fill="white" opacity="0.95" />
                    <circle cx="44" cy="20" r="4" fill="white" opacity="0.95" />
                    <circle cx="32" cy="35" r="4" fill="white" opacity="0.95" />
                    <circle cx="20" cy="48" r="4" fill="white" opacity="0.95" />
                    <circle cx="44" cy="48" r="4" fill="white" opacity="0.95" />
                    <line x1="20" y1="20" x2="32" y2="35" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                    <line x1="44" y1="20" x2="32" y2="35" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                    <line x1="32" y1="35" x2="20" y2="48" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                    <line x1="32" y1="35" x2="44" y2="48" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                    <line x1="20" y1="20" x2="44" y2="20" stroke="white" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
                    <line x1="20" y1="48" x2="44" y2="48" stroke="white" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
                  </svg>
                </Link>
              </motion.div>

              {!isSuccess ? (
                <>
                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-6"
                  >
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Nouveau mot de passe
                    </h1>
                    <p className="text-sm text-gray-500">
                      Choisissez un nouveau mot de passe pour votre compte
                    </p>
                  </motion.div>

                  {/* Form */}
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                      />
                      <p className="mt-1 text-xs text-gray-500">Minimum 6 caractères</p>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le mot de passe
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-orange-500/30"
                    >
                      {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                    </button>
                  </motion.form>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Succès!</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Votre mot de passe a été réinitialisé avec succès.
                  </p>
                  <p className="text-xs text-gray-500">
                    Redirection vers la page de connexion...
                  </p>
                </motion.div>
              )}

              {/* Back to login */}
              {!isSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 text-center"
                >
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors inline-flex items-center gap-1 group"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Retour à la connexion</span>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
