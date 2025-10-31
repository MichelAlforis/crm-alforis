// app/dashboard/demo-container-queries/page.tsx
// ============= DEMO: CONTAINER QUERIES =============
// Demonstrates @container queries for component-based responsive design (V2.8)

'use client'

import React, { useState } from 'react'
import { Box, Maximize2, Minimize2, Mail, Phone, MapPin } from 'lucide-react'

export default function DemoContainerQueriesPage() {
  const [containerWidth, setContainerWidth] = useState<'small' | 'medium' | 'large'>('large')

  const widths = {
    small: 'max-w-sm',
    medium: 'max-w-2xl',
    large: 'max-w-6xl',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 p-fluid-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-fluid-8">
          <div className="flex items-center gap-3 mb-fluid-3">
            <div className="p-3 bg-indigo-500 rounded-lg">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-fluid-4xl font-bold text-gray-900 dark:text-slate-100">
              Container Queries
            </h1>
          </div>

          <p className="text-fluid-lg text-gray-600 dark:text-slate-400 mb-fluid-6">
            Les <strong>container queries</strong> permettent des composants qui s'adaptent à leur <em>conteneur parent</em>
            plutôt qu'au viewport. Redimensionnez les containers ci-dessous!
          </p>

          {/* Container Width Controls */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-fluid-4">
            <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mb-fluid-3 font-medium">
              Taille du container:
            </p>
            <div className="flex gap-fluid-2">
              <button
                onClick={() => setContainerWidth('small')}
                className={`px-fluid-3 py-fluid-2 rounded-lg transition-colors flex items-center gap-2 ${
                  containerWidth === 'small'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                <Minimize2 className="w-4 h-4" />
                <span className="text-fluid-sm font-medium">Small (384px)</span>
              </button>
              <button
                onClick={() => setContainerWidth('medium')}
                className={`px-fluid-3 py-fluid-2 rounded-lg transition-colors flex items-center gap-2 ${
                  containerWidth === 'medium'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                <Box className="w-4 h-4" />
                <span className="text-fluid-sm font-medium">Medium (672px)</span>
              </button>
              <button
                onClick={() => setContainerWidth('large')}
                className={`px-fluid-3 py-fluid-2 rounded-lg transition-colors flex items-center gap-2 ${
                  containerWidth === 'large'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="text-fluid-sm font-medium">Large (1152px)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Container */}
        <div className={`mx-auto transition-all duration-300 ${widths[containerWidth]}`}>
          {/* Example 1: User Card with Container Query */}
          <section className="mb-fluid-8">
            <h2 className="text-fluid-2xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              📇 Carte Utilisateur Adaptive
            </h2>

            <div className="@container bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {/*
                @container enables container queries
                @sm, @md, @lg work like breakpoints but relative to container
              */}
              <div className="p-fluid-4 @sm:p-fluid-6 @lg:flex @lg:items-start @lg:gap-fluid-6">
                {/* Avatar */}
                <div className="mb-fluid-4 @lg:mb-0 flex justify-center @lg:justify-start">
                  <div className="w-20 h-20 @sm:w-24 @sm:h-24 @lg:w-32 @lg:h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl @sm:text-3xl @lg:text-4xl font-bold">
                    JD
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center @lg:text-left">
                  <h3 className="text-fluid-xl @sm:text-fluid-2xl @lg:text-fluid-3xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-2">
                    John Doe
                  </h3>
                  <p className="text-fluid-base text-gray-600 dark:text-slate-400 mb-fluid-4">
                    Senior Product Designer
                  </p>

                  {/* Contact Info - Changes layout based on container */}
                  <div className="grid grid-cols-1 @sm:grid-cols-2 gap-fluid-2 @lg:gap-fluid-3">
                    <div className="flex items-center gap-2 @lg:gap-3 justify-center @lg:justify-start p-fluid-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <Mail className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-fluid-sm text-gray-700 dark:text-slate-300">john@example.com</span>
                    </div>
                    <div className="flex items-center gap-2 @lg:gap-3 justify-center @lg:justify-start p-fluid-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <Phone className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-fluid-sm text-gray-700 dark:text-slate-300">+33 6 12 34 56 78</span>
                    </div>
                    <div className="flex items-center gap-2 @lg:gap-3 justify-center @lg:justify-start p-fluid-2 bg-gray-50 dark:bg-slate-800 rounded-lg @sm:col-span-2">
                      <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-fluid-sm text-gray-700 dark:text-slate-300">Paris, France</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Adapts to container size */}
                <div className="mt-fluid-4 @lg:mt-0 flex @lg:flex-col gap-fluid-2">
                  <button className="flex-1 @lg:flex-none px-fluid-4 py-fluid-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-fluid-sm font-medium">
                    Message
                  </button>
                  <button className="flex-1 @lg:flex-none px-fluid-4 py-fluid-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:bg-slate-800 transition-colors text-fluid-sm font-medium">
                    Profile
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Example 2: Product Grid */}
          <section className="mb-fluid-8">
            <h2 className="text-fluid-2xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              🛍️ Grille Produits Adaptive
            </h2>

            <div className="@container bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-fluid-4 @sm:p-fluid-6">
              {/* Grid adapts to container width */}
              <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-fluid-3 @lg:gap-fluid-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                    <div className="p-fluid-3">
                      <h4 className="text-fluid-base font-semibold text-gray-900 dark:text-slate-100 mb-fluid-1">
                        Produit {i}
                      </h4>
                      <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mb-fluid-2">
                        Description courte
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-fluid-lg font-bold text-indigo-600">
                          €{i * 10}
                        </span>
                        <button className="px-fluid-2 py-fluid-1 bg-indigo-500 text-white rounded text-fluid-xs font-medium hover:bg-indigo-600 transition-colors">
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Example 3: Dashboard Stats */}
          <section className="mb-fluid-8">
            <h2 className="text-fluid-2xl font-bold text-gray-900 dark:text-slate-100 mb-fluid-4">
              📊 Stats Dashboard Adaptive
            </h2>

            <div className="@container bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-fluid-4 @sm:p-fluid-6">
              {/* Stats grid - container aware */}
              <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-fluid-4">
                {[
                  { label: 'Utilisateurs', value: '12.5K', color: 'blue' },
                  { label: 'Revenus', value: '€45K', color: 'green' },
                  { label: 'Commandes', value: '1,234', color: 'purple' },
                  { label: 'Taux Conv.', value: '3.2%', color: 'orange' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 dark:border-slate-700 rounded-lg p-fluid-4 @lg:p-fluid-5"
                  >
                    <p className="text-fluid-sm text-gray-600 dark:text-slate-400 mb-fluid-2">
                      {stat.label}
                    </p>
                    <p className={`text-fluid-2xl @lg:text-fluid-3xl font-bold text-${stat.color}-600`}>
                      {stat.value}
                    </p>
                    <p className="text-fluid-xs text-gray-500 mt-fluid-1">
                      +12% vs mois dernier
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Technical Details */}
        <section className="bg-gray-900 text-white rounded-lg p-fluid-6 mt-fluid-12">
          <h2 className="text-fluid-2xl font-bold mb-fluid-4">💡 Comment ça fonctionne</h2>

          <div className="bg-gray-800 rounded-lg p-fluid-4 mb-fluid-4 border border-gray-700">
            <pre className="text-fluid-sm text-gray-300 overflow-x-auto">
              <code>{`// 1. Marquer un élément comme container
<div className="@container">

  // 2. Utiliser des classes @* pour le responsive
  <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3">
    {/* Contenu */}
  </div>
</div>

// Breakpoints container:
// @sm:  ≥ 384px
// @md:  ≥ 448px
// @lg:  ≥ 512px
// @xl:  ≥ 768px
// @2xl: ≥ 1024px`}</code>
            </pre>
          </div>

          <div className="space-y-fluid-3 text-fluid-base">
            <div>
              <strong className="text-indigo-400">✅ Avantages:</strong>
              <ul className="list-disc list-inside ml-fluid-2 text-gray-300 mt-fluid-2 space-y-fluid-1">
                <li>Composants réutilisables dans différents contextes</li>
                <li>Pas besoin de connaître la largeur du viewport</li>
                <li>Parfait pour les sidebars, modals, cards</li>
              </ul>
            </div>

            <div>
              <strong className="text-pink-400">📦 Use Cases:</strong>
              <ul className="list-disc list-inside ml-fluid-2 text-gray-300 mt-fluid-2 space-y-fluid-1">
                <li>Cartes utilisateur dans sidebar vs contenu principal</li>
                <li>Grilles de produits dans différentes largeurs</li>
                <li>Composants de navigation adaptative</li>
                <li>Layouts dashboard multi-colonnes</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
