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
            <div className="relative p-8 md:p-10">
              {/* Logo/Brand */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
                  Alforis
                </h1>
                <p className="text-gray-500 font-medium text-sm tracking-wide">
                  CRM FINANCE
                </p>
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
                className="mt-6 text-center text-sm text-gray-500"
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
