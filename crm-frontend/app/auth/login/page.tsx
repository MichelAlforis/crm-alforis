// app/auth/login/page.tsx
// ============= LOGIN PAGE - PREMIUM DESIGN =============

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from '@/components/forms'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { login, isSubmitting, error } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        {/* Optimized Video Background - 705KB WebM */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
          style={{ willChange: 'auto' }}
        >
          {/* WebM for modern browsers (90% smaller - 705KB) */}
          <source src="/Video_auth_optimized.webm" type="video/webm" />
          {/* MP4 fallback (1MB) */}
          <source src="/Video_auth_optimized.mp4" type="video/mp4" />
          {/* Gradient fallback for browsers without video support */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(227, 159, 112, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)
              `
            }}
          />
        </video>

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60" />

        {/* Animated subtle glow */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 30% 40%, rgba(227, 159, 112, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 70% 60%, rgba(227, 159, 112, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 30% 40%, rgba(227, 159, 112, 0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
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
            {/* Inner glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(227, 159, 112, 0.05) 0%, transparent 60%)',
              }}
            />

            {/* Content */}
            <div className="relative p-spacing-2xl md:p-spacing-3xl">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-spacing-3xl"
              >
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

                  {/* Rounded background */}
                  <rect width="64" height="64" rx="16" fill="url(#logoGrad)" />

                  {/* Network connections */}
                  <circle cx="20" cy="20" r="4" fill="white" opacity="0.95" />
                  <circle cx="44" cy="20" r="4" fill="white" opacity="0.95" />
                  <circle cx="32" cy="35" r="4" fill="white" opacity="0.95" />
                  <circle cx="20" cy="48" r="4" fill="white" opacity="0.95" />
                  <circle cx="44" cy="48" r="4" fill="white" opacity="0.95" />

                  {/* Connection lines */}
                  <line x1="20" y1="20" x2="32" y2="35" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                  <line x1="44" y1="20" x2="32" y2="35" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                  <line x1="32" y1="35" x2="20" y2="48" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                  <line x1="32" y1="35" x2="44" y2="48" stroke="white" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                  <line x1="20" y1="20" x2="44" y2="20" stroke="white" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
                  <line x1="20" y1="48" x2="44" y2="48" stroke="white" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
                </svg>
              </motion.div>

              {/* Login Form */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <LoginForm
                  onSubmit={login}
                  isLoading={isSubmitting}
                  error={error}
                />
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-spacing-lg text-center text-fluid-sm text-text-secondary"
              >
                <p>© 2025 Alforis Finance. Tous droits réservés.</p>
              </motion.div>
            </div>
          </div>

          {/* Subtle bottom glow */}
          <div
            className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-full h-32 opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(227, 159, 112, 0.4) 0%, transparent 70%)',
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
