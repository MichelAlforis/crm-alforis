// app/dashboard/demo-fluid/page.tsx
// ============= DEMO: FLUID TYPOGRAPHY & SPACING =============
// Demonstrates clamp() based responsive design (V2.6 + V2.7)

'use client'

import React from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Type, Ruler, Smartphone, Monitor, Tablet } from 'lucide-react'

export default function DemoFluidPage() {
  return (
    <PageContainer width="wide">
      {/* Hero Section with Fluid Typography */}
      <section className="px-fluid-4 py-fluid-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-fluid-6">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Type className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-fluid-4xl font-bold text-gray-900 dark:text-slate-100">
              Fluid Typography & Spacing
            </h1>
          </div>

          <p className="text-fluid-lg text-gray-600 dark:text-slate-400 max-w-3xl mb-fluid-8">
            Découvrez comment <strong>clamp()</strong> permet une expérience fluide sans breakpoints brutaux.
            Redimensionnez votre fenêtre pour voir les tailles s'adapter naturellement.
          </p>

          {/* Device Indicators */}
          <div className="flex flex-wrap gap-fluid-3 mb-fluid-8">
            <div className="flex items-center gap-2 px-fluid-3 py-fluid-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span className="text-fluid-sm text-gray-600 dark:text-slate-400">Mobile: 320-768px</span>
            </div>
            <div className="flex items-center gap-2 px-fluid-3 py-fluid-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
              <Tablet className="w-4 h-4 text-purple-500" />
              <span className="text-fluid-sm text-gray-600 dark:text-slate-400">Tablet: 768-1024px</span>
            </div>
            <div className="flex items-center gap-2 px-fluid-3 py-fluid-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
              <Monitor className="w-4 h-4 text-green-500" />
              <span className="text-fluid-sm text-gray-600 dark:text-slate-400">Desktop: 1024px+</span>
            </div>
          </div>
        </div>
      </section>

      {/* Typography Scale Demo */}
      <section className="px-fluid-4 py-fluid-8 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-6">
            📐 Échelle Typographique Fluide
          </h2>

          <div className="grid gap-fluid-4">
            {/* Display Sizes */}
            <div className="p-fluid-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-fluid-xs text-blue-600 font-mono mb-2">text-fluid-5xl</p>
              <h1 className="text-fluid-5xl font-bold text-gray-900 dark:text-slate-100">
                Hero Display
              </h1>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mt-2">
                clamp(2.5rem, 5vw, 4rem) • 40-64px
              </p>
            </div>

            <div className="p-fluid-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-fluid-xs text-purple-600 font-mono mb-2">text-fluid-4xl</p>
              <h2 className="text-fluid-4xl font-bold text-gray-900 dark:text-slate-100">
                Section Header
              </h2>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mt-2">
                clamp(2rem, 4vw, 3rem) • 32-48px
              </p>
            </div>

            <div className="p-fluid-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-fluid-xs text-green-600 font-mono mb-2">text-fluid-3xl</p>
              <h3 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100">
                Card Title
              </h3>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mt-2">
                clamp(1.6rem, 3vw, 2.4rem) • 25.6-38.4px
              </p>
            </div>

            <div className="p-fluid-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <p className="text-fluid-xs text-orange-600 font-mono mb-2">text-fluid-2xl</p>
              <h4 className="text-fluid-2xl font-semibold text-gray-900 dark:text-slate-100">
                Subsection Header
              </h4>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mt-2">
                clamp(1.3rem, 2.5vw, 1.9rem) • 20.8-30.4px
              </p>
            </div>

            {/* Body Sizes */}
            <div className="p-fluid-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-fluid-xs text-gray-600 dark:text-slate-400 font-mono mb-2">text-fluid-lg</p>
              <p className="text-fluid-lg text-gray-900 dark:text-slate-100">
                Lead paragraph text for emphasis. Perfect for introductions and highlights.
              </p>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mt-2">
                clamp(1rem, 1.5vw, 1.3rem) • 16-20.8px
              </p>
            </div>

            <div className="p-fluid-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-fluid-xs text-gray-600 dark:text-slate-400 font-mono mb-2">text-fluid-base</p>
              <p className="text-fluid-base text-gray-900 dark:text-slate-100">
                Body text for articles, descriptions, and general content. This is the default reading size.
              </p>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mt-2">
                clamp(0.9rem, 1.2vw, 1.1rem) • 14.4-17.6px
              </p>
            </div>

            <div className="p-fluid-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-fluid-xs text-gray-600 dark:text-slate-400 font-mono mb-2">text-fluid-sm</p>
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400">
                Smaller text for captions, labels, and secondary information.
              </p>
              <p className="text-fluid-xs text-gray-600 dark:text-slate-400 mt-2">
                clamp(0.8rem, 1vw, 0.9rem) • 12.8-14.4px
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Demo */}
      <section className="px-fluid-4 py-fluid-8 bg-gray-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-6">
            📏 Espacements Fluides
          </h2>

          <div className="grid gap-fluid-4">
            <div className="bg-white dark:bg-slate-900 p-fluid-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 font-mono mb-fluid-2">p-fluid-4 • gap-fluid-2</p>
              <div className="flex gap-fluid-2">
                <div className="flex-1 h-16 bg-blue-100 rounded flex items-center justify-center text-fluid-sm text-blue-700">
                  Box 1
                </div>
                <div className="flex-1 h-16 bg-blue-100 rounded flex items-center justify-center text-fluid-sm text-blue-700">
                  Box 2
                </div>
                <div className="flex-1 h-16 bg-blue-100 rounded flex items-center justify-center text-fluid-sm text-blue-700">
                  Box 3
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-fluid-6 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 font-mono mb-fluid-3">p-fluid-6 • gap-fluid-3</p>
              <div className="flex gap-fluid-3">
                <div className="flex-1 h-20 bg-purple-100 rounded flex items-center justify-center text-fluid-base text-purple-700">
                  Card 1
                </div>
                <div className="flex-1 h-20 bg-purple-100 rounded flex items-center justify-center text-fluid-base text-purple-700">
                  Card 2
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-fluid-8 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-fluid-sm text-gray-600 dark:text-slate-400 font-mono mb-fluid-4">p-fluid-8 • gap-fluid-4</p>
              <div className="flex gap-fluid-4">
                <div className="flex-1 h-24 bg-green-100 rounded flex items-center justify-center text-fluid-lg text-green-700">
                  Section 1
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-world Example: Card Grid */}
      <section className="px-fluid-4 py-fluid-12 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-3">
            🎯 Exemple Réel: Grille de Cartes
          </h2>
          <p className="text-fluid-base text-gray-600 dark:text-slate-400 mb-fluid-8">
            Toutes les tailles et espacements s'adaptent automatiquement
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-fluid-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 dark:border-slate-700 rounded-lg p-fluid-4 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-lg mb-fluid-3 flex items-center justify-center text-white text-fluid-xl font-bold">
                  {i}
                </div>
                <h3 className="text-fluid-xl font-semibold text-gray-900 dark:text-slate-100 mb-fluid-2">
                  Carte Exemple {i}
                </h3>
                <p className="text-fluid-base text-gray-600 dark:text-slate-400 mb-fluid-3">
                  Le contenu s'adapte naturellement à la taille de l'écran sans breakpoints fixes.
                </p>
                <div className="flex gap-fluid-2">
                  <span className="px-fluid-2 py-fluid-1 bg-blue-100 text-blue-700 rounded text-fluid-sm font-medium">
                    Tag
                  </span>
                  <span className="px-fluid-2 py-fluid-1 bg-green-100 text-green-700 rounded text-fluid-sm font-medium">
                    Fluide
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="px-fluid-4 py-fluid-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-fluid-4">
            <Ruler className="w-6 h-6 text-blue-400" />
            <h2 className="text-fluid-2xl font-bold">Comment ça fonctionne</h2>
          </div>

          <div className="bg-gray-800 rounded-lg p-fluid-4 border border-gray-700">
            <pre className="text-fluid-sm text-gray-300 overflow-x-auto">
              <code>{`// Tailwind Config
fontSize: {
  'fluid-base': ['clamp(0.9rem, 1.2vw, 1.1rem)', { lineHeight: '1.6' }],
  'fluid-xl': ['clamp(1.1rem, 2vw, 1.5rem)', { lineHeight: '1.5' }],
}

spacing: {
  'fluid-4': 'clamp(1rem, 2vw, 1.5rem)',   // 16-24px
  'fluid-8': 'clamp(2rem, 4vw, 3.5rem)',   // 32-56px
}

// Usage
<h1 className="text-fluid-4xl mb-fluid-8">
  Titre qui s'adapte
</h1>`}</code>
            </pre>
          </div>

          <p className="text-fluid-base text-gray-400 mt-fluid-4">
            <strong className="text-white">clamp(min, preferred, max)</strong> calcule automatiquement
            la taille idéale entre les valeurs min et max, en fonction du viewport.
          </p>
        </div>
      </section>
    </PageContainer>
  )
}
