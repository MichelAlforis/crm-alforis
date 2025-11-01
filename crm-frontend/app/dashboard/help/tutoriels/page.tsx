'use client'

import { Video, ArrowLeft, Clock, Play } from 'lucide-react'
import Link from 'next/link'
import { PageContainer, PageTitle } from '@/components/shared'

interface Tutorial {
  title: string
  description: string
  duration: string
  thumbnail: string
  url: string
  category: string
}

const tutorials: Tutorial[] = [
  {
    title: 'Découverte du CRM en 5 minutes',
    description: 'Tour d\'horizon complet de l\'interface et des fonctionnalités principales',
    duration: '5:30',
    thumbnail: '/placeholder-video.jpg',
    url: '#',
    category: 'Démarrage',
  },
  {
    title: 'Créer votre première organisation',
    description: 'Apprenez à créer et configurer une organisation étape par étape',
    duration: '3:45',
    thumbnail: '/placeholder-video.jpg',
    url: '#',
    category: 'CRM',
  },
  {
    title: 'Workflows automatisés : Guide complet',
    description: 'Créez des workflows pour automatiser vos tâches répétitives',
    duration: '8:20',
    thumbnail: '/placeholder-video.jpg',
    url: '#',
    category: 'Automation',
  },
  {
    title: 'Créer une campagne email marketing',
    description: 'De la segmentation à l\'analyse des résultats',
    duration: '6:15',
    thumbnail: '/placeholder-video.jpg',
    url: '#',
    category: 'Marketing',
  },
]

export default function TutorielsPage() {
  return (
    <PageContainer width="default">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-fluid-sm text-text-secondary dark:text-slate-400">
        <Link href="/dashboard/help" className="hover:text-text-primary dark:hover:text-white dark:text-text-primary transition">
          Aide
        </Link>
        <span>/</span>
        <span className="text-text-primary dark:text-text-primary font-medium">Tutoriels vidéo</span>
      </nav>

      {/* Header */}
      <header className="space-y-spacing-md text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-purple-50 p-4">
            <Video className="h-12 w-12 text-purple-600" />
          </div>
        </div>
        <PageTitle subtitle="Regardez nos démonstrations pas à pas pour maîtriser rapidement le CRM">
          Tutoriels Vidéo
        </PageTitle>
      </header>

      {/* Coming Soon Message */}
      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-12 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
          <Video className="h-10 w-10 text-purple-600" />
        </div>
        <h2 className="mb-4 text-fluid-3xl font-bold text-text-primary dark:text-text-primary">
          Bientôt disponible !
        </h2>
        <p className="mx-auto mb-spacing-lg max-w-xl text-fluid-lg text-text-secondary dark:text-slate-300">
          Nous préparons une bibliothèque complète de tutoriels vidéo pour vous accompagner dans l&apos;utilisation du CRM.
        </p>
        <div className="grid gap-spacing-md sm:grid-cols-2 max-w-2xl mx-auto text-left">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-purple-200">
            <div className="font-semibold text-purple-900 mb-2">📹 Vidéos de démonstration</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Tutoriels complets sur chaque fonctionnalité du CRM
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-purple-200">
            <div className="font-semibold text-purple-900 mb-2">🎯 Cas d&apos;usage réels</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Exemples concrets d&apos;utilisation par nos clients
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-purple-200">
            <div className="font-semibold text-purple-900 mb-2">⚡ Astuces et raccourcis</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Optimisez votre productivité avec nos conseils d&apos;experts
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-purple-200">
            <div className="font-semibold text-purple-900 mb-2">🆕 Nouvelles fonctionnalités</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Restez à jour avec les dernières évolutions du CRM
            </p>
          </div>
        </div>
      </div>

      {/* Tutoriels à venir (preview) */}
      <section>
        <h2 className="mb-6 text-fluid-2xl font-bold text-gray-900 dark:text-slate-100">
          Tutoriels en préparation
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {tutorials.map((tutorial, index) => (
            <div
              key={index}
              className="group rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 overflow-hidden opacity-60"
            >
              {/* Thumbnail placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <Play className="h-16 w-16 text-gray-400" />
                <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {tutorial.duration}
                </div>
                <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                  {tutorial.category}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{tutorial.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">{tutorial.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alternative : Guides écrits */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
        <h2 className="mb-4 text-center text-fluid-2xl font-bold text-gray-900 dark:text-slate-100">
          En attendant, consultez nos guides écrits
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-center text-gray-700 dark:text-slate-300">
          Toutes les fonctionnalités sont documentées dans nos guides détaillés avec captures d&apos;écran
        </p>
        <div className="flex justify-center">
          <Link
            href="/dashboard/help/guides"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            📚 Voir tous les guides
          </Link>
        </div>
      </section>

      {/* Notification */}
      <section className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">
          🔔 Soyez notifié de la sortie des tutoriels vidéo
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
          Contactez le support à <a href="mailto:support@alforis.fr" className="text-blue-600 hover:underline">support@alforis.fr</a> pour être informé dès la mise en ligne des premières vidéos.
        </p>
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
    </PageContainer>
  )
}
