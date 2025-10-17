'use client'

import { useState } from 'react'
import {
  HelpCircle,
  Book,
  Video,
  MessageCircle,
  Mail,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqs: FAQItem[] = [
  {
    category: 'Général',
    question: 'Comment créer un nouvel investisseur ?',
    answer:
      'Pour créer un nouvel investisseur, rendez-vous dans la section "Investisseurs" du menu principal, puis cliquez sur le bouton "Nouvel investisseur" en haut à droite. Remplissez les informations requises et cliquez sur "Enregistrer".',
  },
  {
    category: 'Général',
    question: 'Comment inviter un collaborateur ?',
    answer:
      'Allez dans Paramètres > Équipe & accès, puis cliquez sur "Inviter un membre". Entrez l\'adresse email du collaborateur et cliquez sur "Envoyer l\'invitation". Il recevra un email avec un lien d\'activation.',
  },
  {
    category: 'Fournisseurs',
    question: 'Quelle est la différence entre un fournisseur et un investisseur ?',
    answer:
      'Les fournisseurs sont des entités qui fournissent des produits ou services à votre entreprise (banques, gestionnaires d\'actifs, etc.), tandis que les investisseurs sont vos clients qui investissent dans ces produits.',
  },
  {
    category: 'Mandats',
    question: 'Comment associer un produit à un mandat ?',
    answer:
      'Dans la page de détail d\'un mandat, cliquez sur "Ajouter un produit", puis sélectionnez le produit dans la liste déroulante. Vous pouvez également définir des détails spécifiques à cette association.',
  },
  {
    category: 'Sécurité',
    question: 'Comment activer la double authentification ?',
    answer:
      'La double authentification sera bientôt disponible. Allez dans Paramètres > Sécurité, puis activez l\'option "Double authentification". Vous devrez scanner un QR code avec votre application d\'authentification.',
  },
  {
    category: 'Intégrations',
    question: 'Quelles intégrations sont disponibles ?',
    answer:
      'Actuellement, le CRM prend en charge Slack, Notion, Zapier et les Webhooks API. D\'autres intégrations (Microsoft Teams, Google Workspace) seront ajoutées prochainement.',
  },
  {
    category: 'Facturation',
    question: 'Comment télécharger mes factures ?',
    answer:
      'Le téléchargement des factures sera disponible une fois l\'intégration Stripe activée. Vous pourrez alors accéder à toutes vos factures depuis Paramètres > Abonnement & facturation.',
  },
  {
    category: 'Données',
    question: 'Comment exporter mes données ?',
    answer:
      'Vous pouvez exporter vos données au format CSV ou JSON depuis chaque section (Investisseurs, Fournisseurs, etc.). Cliquez sur le bouton "Exporter" en haut à droite de la liste.',
  },
]

const resources = [
  {
    title: 'Guide de démarrage',
    description: 'Apprenez les bases du CRM en 10 minutes',
    icon: Book,
    link: '#',
    color: 'blue',
  },
  {
    title: 'Tutoriels vidéo',
    description: 'Regardez des démonstrations pas à pas',
    icon: Video,
    link: '#',
    color: 'purple',
  },
  {
    title: 'Documentation API',
    description: 'Intégrez le CRM avec vos outils',
    icon: ExternalLink,
    link: '/docs',
    color: 'green',
  },
  {
    title: 'Support par chat',
    description: 'Discutez avec notre équipe en direct',
    icon: MessageCircle,
    link: '#',
    color: 'amber',
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous')

  const categories = ['Tous', ...Array.from(new Set(faqs.map((faq) => faq.category)))]

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'Tous' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
    },
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 text-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            <HelpCircle className="h-4 w-4" />
            Centre d&apos;aide
          </span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">
          Comment pouvons-nous vous aider ?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Trouvez rapidement des réponses à vos questions ou contactez notre équipe support
        </p>
      </header>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans la documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
          />
        </div>
      </div>

      {/* Resources Grid */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Ressources populaires
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resources.map((resource) => {
            const Icon = resource.icon
            const colors = colorMap[resource.color]
            return (
              <a
                key={resource.title}
                href={resource.link}
                className={`rounded-xl border ${colors.border} ${colors.bg} p-6 transition hover:shadow-lg hover:scale-105`}
              >
                <div className={`inline-flex rounded-lg ${colors.icon} p-3 bg-white/80 mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </a>
            )
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Questions fréquentes
          </h2>
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFAQs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-600">
                Aucune question ne correspond à votre recherche.
              </p>
            </div>
          ) : (
            filteredFAQs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <span className="inline-block text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">
                      {faq.category}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {faq.question}
                    </h3>
                  </div>
                  {expandedFAQ === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-5 pb-5 text-gray-600 border-t border-gray-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-full bg-blue-100 p-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Vous ne trouvez pas ce que vous cherchez ?
        </h2>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
          Notre équipe support est disponible du lundi au vendredi de 9h à 18h pour répondre à toutes vos questions
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="mailto:support@alforis.fr"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Mail className="h-4 w-4" />
            Contacter le support
          </a>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            <MessageCircle className="h-4 w-4" />
            Démarrer un chat
          </button>
        </div>
      </section>
    </div>
  )
}
