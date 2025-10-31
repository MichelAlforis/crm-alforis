'use client'

import { useState } from 'react'
import {
  Building2,
  Users,
  FileText,
  Package,
  MessageSquare,
  Zap,
  Mail,
  Filter,
  Download,
  ArrowLeft,
  Clock,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

interface Guide {
  slug: string
  title: string
  description: string
  icon: React.ElementType
  readTime: number
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé'
  color: string
  category: 'CRM' | 'Automation' | 'Marketing' | 'Outils'
}

const guides: Guide[] = [
  // CRM Core
  {
    slug: 'organisations',
    title: 'Gérer les Organisations',
    description: 'Créez, suivez et gérez vos relations avec banques, gestionnaires et clients',
    icon: Building2,
    readTime: 5,
    difficulty: 'Débutant',
    color: 'blue',
    category: 'CRM',
  },
  {
    slug: 'personnes',
    title: 'Gérer les Contacts',
    description: 'Ajoutez des contacts, consultez leur historique et segmentez votre base',
    icon: Users,
    readTime: 5,
    difficulty: 'Débutant',
    color: 'green',
    category: 'CRM',
  },
  {
    slug: 'mandats',
    title: 'Mandats de Distribution',
    description: 'Créez et suivez vos contrats de distribution avec les fournisseurs',
    icon: FileText,
    readTime: 6,
    difficulty: 'Intermédiaire',
    color: 'purple',
    category: 'CRM',
  },
  {
    slug: 'produits',
    title: 'Catalogue Produits',
    description: 'Gérez votre catalogue de produits financiers et suivez leurs performances',
    icon: Package,
    readTime: 5,
    difficulty: 'Débutant',
    color: 'indigo',
    category: 'CRM',
  },
  {
    slug: 'interactions',
    title: 'Interactions & Historique',
    description: 'Enregistrez tous vos échanges et gardez un historique complet',
    icon: MessageSquare,
    readTime: 4,
    difficulty: 'Débutant',
    color: 'cyan',
    category: 'CRM',
  },

  // Automation
  {
    slug: 'workflows',
    title: 'Workflows Automatisés',
    description: 'Automatisez vos tâches répétitives avec des workflows intelligents',
    icon: Zap,
    readTime: 8,
    difficulty: 'Intermédiaire',
    color: 'amber',
    category: 'Automation',
  },

  // Marketing
  {
    slug: 'marketing',
    title: 'Marketing & Campagnes',
    description: 'Créez des campagnes email, segmentez vos contacts et analysez les résultats',
    icon: Mail,
    readTime: 7,
    difficulty: 'Intermédiaire',
    color: 'pink',
    category: 'Marketing',
  },

  // Outils
  {
    slug: 'filtres',
    title: 'Filtres Avancés',
    description: 'Maîtrisez les filtres pour trouver rapidement l\'information recherchée',
    icon: Filter,
    readTime: 4,
    difficulty: 'Débutant',
    color: 'teal',
    category: 'Outils',
  },
  {
    slug: 'exports',
    title: 'Exports de Données',
    description: 'Exportez vos données en CSV ou Excel pour vos rapports et analyses',
    icon: Download,
    readTime: 3,
    difficulty: 'Débutant',
    color: 'orange',
    category: 'Outils',
  },
]

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', icon: 'text-cyan-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', icon: 'text-amber-600' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', icon: 'text-pink-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', icon: 'text-teal-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600' },
}

const difficultyColor: Record<string, string> = {
  Débutant: 'bg-green-100 text-green-700',
  Intermédiaire: 'bg-amber-100 text-amber-700',
  Avancé: 'bg-red-100 text-red-700',
}

export default function GuidesPage() {
  const categories = ['Tous', 'CRM', 'Automation', 'Marketing', 'Outils']
  const [selectedCategory, setSelectedCategory] = useState('Tous')

  const filteredGuides =
    selectedCategory === 'Tous'
      ? guides
      : guides.filter((g) => g.category === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
        <Link href="/dashboard/help" className="hover:text-gray-900 dark:hover:text-white dark:text-slate-100 transition">
          Aide
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-slate-100 font-medium">Guides</span>
      </nav>

      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Guides par Fonctionnalité</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
          Maîtrisez chaque module du CRM avec nos guides détaillés étape par étape
        </p>
      </header>

      {/* Filtres de catégorie */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{guides.length}</div>
          <div className="text-sm text-blue-800">Guides disponibles</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {guides.reduce((acc, g) => acc + g.readTime, 0)} min
          </div>
          <div className="text-sm text-green-800">Temps de lecture total</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {new Set(guides.map((g) => g.category)).size}
          </div>
          <div className="text-sm text-purple-800">Catégories</div>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredGuides.map((guide) => {
          const Icon = guide.icon
          const colors = colorMap[guide.color]

          return (
            <Link
              key={guide.slug}
              href={`/dashboard/help/guides/${guide.slug}`}
              className={`group rounded-xl border-2 ${colors.border} ${colors.bg} p-6 transition hover:shadow-lg hover:scale-105`}
            >
              {/* Icon */}
              <div className={`inline-flex rounded-lg ${colors.icon} p-3 bg-white dark:bg-slate-900/80 mb-4`}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className={`text-xl font-semibold ${colors.text} mb-2 group-hover:underline`}>
                {guide.title}
              </h3>

              {/* Description */}
              <p className="text-gray-700 dark:text-slate-300 text-sm mb-4">{guide.description}</p>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
                    <Clock className="h-3 w-3" />
                    {guide.readTime} min
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full font-medium ${
                      difficultyColor[guide.difficulty]
                    }`}
                  >
                    {guide.difficulty}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Call to Action */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-blue-200">
        <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Vous ne trouvez pas ce que vous cherchez ?
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-xl mx-auto">
          Consultez notre FAQ complète ou contactez notre équipe support
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/help#faq"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Voir la FAQ
          </Link>
          <Link
            href="/dashboard/help#support"
            className="px-6 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-gray-50 dark:bg-slate-800 transition"
          >
            Contacter le support
          </Link>
        </div>
      </section>

      {/* Retour */}
      <section className="text-center">
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au centre d&apos;aide
        </Link>
      </section>
    </div>
  )
}
