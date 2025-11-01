// app/dashboard/demo-modern-units/page.tsx
// ============= DEMO: MODERN VIEWPORT UNITS & SAFE AREAS =============
// Demonstrates dvh/dvw units and iOS safe areas (V2.9 + V2.10)

'use client'

import React, { useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Smartphone, Info, Check, X } from 'lucide-react'

export default function DemoModernUnitsPage() {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <PageContainer width="wide">
      {/* ============= SAFE AREAS DEMO ============= */}
      {/* Header with iOS safe area */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700"
        style={{
          // iOS safe area for notch
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500 rounded-lg">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-fluid-2xl font-bold text-gray-900 dark:text-slate-100">
                Modern Viewport Units
              </h1>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400">
                dvh, dvw & iOS Safe Areas
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-fluid-4 py-fluid-8">
        <div className="max-w-7xl mx-auto space-y-fluid-8">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-fluid-4 flex gap-fluid-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-fluid-lg font-semibold text-blue-900 mb-fluid-2">
                Pourquoi ces unités modernes?
              </h3>
              <p className="text-fluid-base text-blue-800">
                Les unités <code className="bg-blue-100 px-2 py-1 rounded">vh/vw</code> classiques
                ne tiennent pas compte des barres d'URL mobiles et des encoches iOS. Les unités
                <code className="bg-blue-100 px-2 py-1 rounded ml-1">dvh/dvw</code> et
                <code className="bg-blue-100 px-2 py-1 rounded ml-1">env(safe-area-inset-*)</code>
                résolvent ces problèmes.
              </p>
            </div>
          </div>

          {/* Problem Demonstration */}
          <section>
            <h2 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              🐛 Le Problème avec vh
            </h2>

            <div className="grid md:grid-cols-2 gap-fluid-4">
              {/* Bad: vh */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-red-200 overflow-hidden">
                <div className="bg-red-50 p-fluid-3 border-b border-red-200">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-600" />
                    <h3 className="text-fluid-lg font-semibold text-red-900">
                      Avec vh (❌ Classique)
                    </h3>
                  </div>
                </div>
                <div className="p-fluid-4">
                  <div
                    className="bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center"
                    style={{ height: '20vh' }}
                  >
                    <div className="text-center">
                      <p className="text-fluid-base font-semibold text-red-900">
                        height: 20vh
                      </p>
                      <p className="text-fluid-sm text-red-700 mt-2">
                        Ne tient pas compte de la barre d'URL mobile
                      </p>
                    </div>
                  </div>
                  <ul className="mt-fluid-3 space-y-fluid-2 text-fluid-sm text-gray-600 dark:text-slate-400">
                    <li>❌ Sur mobile, la barre d'URL cache le contenu</li>
                    <li>❌ Taille change lors du scroll (barre d'URL apparaît/disparaît)</li>
                    <li>❌ Layout instable et expérience dégradée</li>
                  </ul>
                </div>
              </div>

              {/* Good: dvh */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-green-200 overflow-hidden">
                <div className="bg-green-50 p-fluid-3 border-b border-green-200">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <h3 className="text-fluid-lg font-semibold text-green-900">
                      Avec dvh (✅ Moderne)
                    </h3>
                  </div>
                </div>
                <div className="p-fluid-4">
                  <div
                    className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center"
                    style={{ height: '20dvh' }}
                  >
                    <div className="text-center">
                      <p className="text-fluid-base font-semibold text-green-900">
                        height: 20dvh
                      </p>
                      <p className="text-fluid-sm text-green-700 mt-2">
                        S'adapte dynamiquement au viewport réel
                      </p>
                    </div>
                  </div>
                  <ul className="mt-fluid-3 space-y-fluid-2 text-fluid-sm text-gray-600 dark:text-slate-400">
                    <li>✅ Tient compte de la barre d'URL mobile</li>
                    <li>✅ Taille stable, même lors du scroll</li>
                    <li>✅ Meilleure UX sur tous les devices</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Full Height Demo */}
          <section>
            <h2 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              📱 Démo: Page Pleine Hauteur
            </h2>

            <button
              onClick={() => setShowComparison(!showComparison)}
              className="mb-fluid-4 px-fluid-4 py-fluid-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-fluid-base font-medium"
            >
              {showComparison ? 'Masquer' : 'Afficher'} la comparaison
            </button>

            {showComparison && (
              <div className="grid md:grid-cols-2 gap-fluid-4">
                {/* vh demo */}
                <div>
                  <div className="bg-red-50 border border-red-200 rounded-t-lg p-fluid-2 text-center">
                    <code className="text-fluid-sm font-mono text-red-900">
                      height: 100vh
                    </code>
                  </div>
                  <div
                    className="bg-gradient-to-br from-red-100 to-pink-100 border-x border-b border-red-200 rounded-b-lg flex items-center justify-center"
                    style={{ height: '100vh' }}
                  >
                    <p className="text-fluid-xl font-bold text-red-900">
                      100vh<br />
                      <span className="text-fluid-sm">Peut déborder sur mobile</span>
                    </p>
                  </div>
                </div>

                {/* dvh demo */}
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-t-lg p-fluid-2 text-center">
                    <code className="text-fluid-sm font-mono text-green-900">
                      height: 100dvh
                    </code>
                  </div>
                  <div
                    className="bg-gradient-to-br from-green-100 to-emerald-100 border-x border-b border-green-200 rounded-b-lg flex items-center justify-center"
                    style={{ height: '100dvh' }}
                  >
                    <p className="text-fluid-xl font-bold text-green-900">
                      100dvh<br />
                      <span className="text-fluid-sm">S'adapte parfaitement</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* iOS Safe Areas */}
          <section>
            <h2 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              🍎 iOS Safe Areas (Encoches & Home Indicator)
            </h2>

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Simulated iPhone Notch */}
              <div className="bg-gray-900 relative">
                <div
                  className="mx-auto w-32 h-6 bg-black rounded-b-2xl"
                  style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}
                />

                {/* Header with safe area */}
                <div
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                  style={{
                    paddingTop: 'max(1rem, env(safe-area-inset-top))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                  }}
                >
                  <div className="p-fluid-4">
                    <h3 className="text-fluid-xl font-bold">Safe Header</h3>
                    <p className="text-fluid-sm opacity-90">
                      S'adapte automatiquement à l'encoche
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-900 p-fluid-4" style={{ minHeight: '40dvh' }}>
                  <p className="text-fluid-base text-gray-700 dark:text-slate-300 mb-fluid-4">
                    Le contenu s'affiche correctement sous l'encoche et au-dessus de l'indicateur d'accueil iOS.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-fluid-3">
                    <code className="text-fluid-sm font-mono text-blue-900">
                      {`padding-top: max(1rem, env(safe-area-inset-top));
padding-left: max(1rem, env(safe-area-inset-left));
padding-right: max(1rem, env(safe-area-inset-right));
padding-bottom: max(1rem, env(safe-area-inset-bottom));`}
                    </code>
                  </div>
                </div>

                {/* Footer with safe area */}
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  style={{
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                  }}
                >
                  <div className="p-fluid-4">
                    <p className="text-fluid-base">
                      Footer sécurisé pour iOS home indicator
                    </p>
                  </div>
                </div>

                {/* Simulated Home Indicator */}
                <div className="h-5 bg-gray-900 flex items-center justify-center">
                  <div className="w-32 h-1 bg-gray-600 rounded-full" />
                </div>
              </div>
            </div>
          </section>

          {/* Code Examples */}
          <section className="bg-gray-900 text-white rounded-lg p-fluid-6">
            <h2 className="text-fluid-2xl font-bold mb-fluid-4">💻 Code Examples</h2>

            <div className="space-y-fluid-4">
              {/* dvh Example */}
              <div>
                <h3 className="text-fluid-lg font-semibold text-cyan-400 mb-fluid-2">
                  1. Dynamic Viewport Height (dvh)
                </h3>
                <div className="bg-gray-800 rounded-lg p-fluid-4 border border-gray-700">
                  <pre className="text-fluid-sm text-gray-300 overflow-x-auto">
                    <code>{`// ❌ Ancien (vh)
<div className="min-h-screen">  {/* Peut déborder sur mobile */}

// ✅ Nouveau (dvh)
<div style={{ minHeight: '100dvh' }}>  {/* S'adapte dynamiquement */}

// Autres unités dynamiques:
// - dvw: Dynamic Viewport Width
// - dvmin: Minimum entre dvh et dvw
// - dvmax: Maximum entre dvh et dvw`}</code>
                  </pre>
                </div>
              </div>

              {/* Safe Areas Example */}
              <div>
                <h3 className="text-fluid-lg font-semibold text-cyan-400 mb-fluid-2">
                  2. iOS Safe Areas
                </h3>
                <div className="bg-gray-800 rounded-lg p-fluid-4 border border-gray-700">
                  <pre className="text-fluid-sm text-gray-300 overflow-x-auto">
                    <code>{`// Header avec encoche iOS
<header style={{
  paddingTop: 'max(1rem, env(safe-area-inset-top))',
  paddingLeft: 'max(1rem, env(safe-area-inset-left))',
  paddingRight: 'max(1rem, env(safe-area-inset-right))',
}}>
  {/* Contenu header */}
</header>

// Footer avec home indicator iOS
<footer style={{
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
}}>
  {/* Contenu footer */}
</footer>

// Variables disponibles:
// - env(safe-area-inset-top)
// - env(safe-area-inset-bottom)
// - env(safe-area-inset-left)
// - env(safe-area-inset-right)`}</code>
                  </pre>
                </div>
              </div>

              {/* Tailwind Custom Plugin */}
              <div>
                <h3 className="text-fluid-lg font-semibold text-cyan-400 mb-fluid-2">
                  3. Plugin Tailwind (Optionnel)
                </h3>
                <div className="bg-gray-800 rounded-lg p-fluid-4 border border-gray-700">
                  <pre className="text-fluid-sm text-gray-300 overflow-x-auto">
                    <code>{`// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      height: {
        'screen-dvh': '100dvh',
      },
      minHeight: {
        'screen-dvh': '100dvh',
      },
    },
  },
}

// Usage:
<div className="min-h-screen-dvh">
  {/* Pleine hauteur dynamique */}
</div>`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Browser Support */}
          <section className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-fluid-6">
            <h2 className="text-fluid-2xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              🌐 Support Navigateurs
            </h2>

            <div className="grid md:grid-cols-2 gap-fluid-4">
              <div>
                <h3 className="text-fluid-lg font-semibold text-green-900 mb-fluid-2">
                  dvh/dvw Units
                </h3>
                <ul className="space-y-fluid-1 text-fluid-sm text-gray-700 dark:text-slate-300">
                  <li>✅ iOS Safari 15.4+ (2022)</li>
                  <li>✅ Chrome 108+ (2022)</li>
                  <li>✅ Firefox 101+ (2022)</li>
                  <li>✅ Edge 108+ (2022)</li>
                </ul>
                <p className="text-fluid-xs text-gray-600 dark:text-slate-400 mt-fluid-2">
                  Fallback: utiliser vh comme backup
                </p>
              </div>

              <div>
                <h3 className="text-fluid-lg font-semibold text-green-900 mb-fluid-2">
                  Safe Area Insets
                </h3>
                <ul className="space-y-fluid-1 text-fluid-sm text-gray-700 dark:text-slate-300">
                  <li>✅ iOS Safari 11.2+ (2018)</li>
                  <li>✅ Chrome Android (tous)</li>
                  <li>✅ Safari macOS (notch MacBook Pro)</li>
                  <li>⚠️ Desktop browsers: 0px (pas d'effet)</li>
                </ul>
                <p className="text-fluid-xs text-gray-600 dark:text-slate-400 mt-fluid-2">
                  Utilise max() pour garantir un padding minimum
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Fixed Bottom Navigation with Safe Area */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-lg z-50"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-around py-3">
          {['Accueil', 'Recherche', 'Profil'].map((label) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1 px-fluid-3 py-fluid-2 text-gray-600 dark:text-slate-400 hover:text-cyan-600 transition-colors"
            >
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
              <span className="text-fluid-xs">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-20" />
    </PageContainer>
  )
}
