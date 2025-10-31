'use client'

import { Building2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ArticleRating } from '@/components/help/ArticleRating'

export default function GuideOrganisations() {
  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
        <Link href="/dashboard/help" className="hover:text-gray-900 dark:hover:text-white dark:text-slate-100 transition">
          Aide
        </Link>
        <span>/</span>
        <Link href="/dashboard/help/guides" className="hover:text-gray-900 dark:hover:text-white dark:text-slate-100 transition">
          Guides
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-slate-100 font-medium">Organisations</span>
      </nav>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium px-2 py-1 bg-green-100 text-green-700 rounded">
                Débutant
              </span>
              <span className="text-sm text-gray-600 dark:text-slate-400">5 min de lecture</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Gérer les Organisations</h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mt-1">
              Créez, suivez et gérez vos relations avec banques, gestionnaires et clients
            </p>
          </div>
        </div>
      </header>

      {/* Vue d'ensemble */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-3">🎯 À quoi ça sert ?</h2>
        <p className="text-blue-800">
          Une <strong>organisation</strong> représente une entité avec laquelle vous avez une relation commerciale :
          banque, gestionnaire d&apos;actifs, family office, client institutionnel, etc.
          C&apos;est le point central pour gérer vos contacts, mandats, interactions et opportunités commerciales.
        </p>
      </section>

      {/* Comment créer */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 border-b pb-2">
          🚀 Créer une organisation
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Accéder à la section Organisations</h3>
              <p className="text-gray-700 dark:text-slate-300">
                Cliquez sur <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded font-mono text-sm">Organisations</span> dans le menu principal à gauche.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Créer une nouvelle organisation</h3>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Cliquez sur le bouton <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Nouvelle organisation</span> en haut à droite de la liste.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Remplir les informations</h3>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-slate-100 mb-1">Nom <span className="text-red-600">*</span></div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Le nom de l&apos;organisation. Ex: &quot;Banque Dupont&quot;</p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-slate-100 mb-1">Type <span className="text-red-600">*</span></div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Banque, Gestionnaire d&apos;actifs, Family Office, Assureur, etc.</p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-slate-100 mb-1">Statut</div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    <strong>Prospect</strong> (découverte), <strong>Qualifié</strong> (intérêt confirmé),
                    <strong> Client</strong> (actif), <strong>Inactif</strong>, <strong>Perdu</strong>
                  </p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-slate-100 mb-1">Informations optionnelles</div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Adresse, téléphone, site web, SIRET, etc.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Enregistrer</h3>
              <p className="text-gray-700 dark:text-slate-300">
                Cliquez sur <span className="px-2 py-1 bg-green-600 text-white rounded text-sm">Enregistrer</span> pour créer l&apos;organisation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ajouter des contacts */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 border-b pb-2">
          👥 Ajouter des contacts à une organisation
        </h2>
        <p className="text-gray-700 dark:text-slate-300">
          Une fois l&apos;organisation créée, vous pouvez lui associer des personnes de contact :
        </p>

        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">1.</span>
            <div>
              Depuis la <strong>fiche organisation</strong>, cliquez sur l&apos;onglet <strong>Contacts</strong>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">2.</span>
            <div>
              Cliquez sur <strong>Ajouter un contact</strong>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">3.</span>
            <div>
              Sélectionnez une <strong>personne existante</strong> ou créez-en une nouvelle
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">4.</span>
            <div>
              Définissez sa <strong>fonction</strong> dans l&apos;organisation (ex: Directeur, Gérant, Contact commercial)
            </div>
          </li>
        </ol>
      </section>

      {/* Suivre l'activité */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 border-b pb-2">
          📊 Suivre l&apos;activité d&apos;une organisation
        </h2>
        <p className="text-gray-700 dark:text-slate-300">
          Chaque organisation dispose de plusieurs onglets pour suivre toute l&apos;activité :
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">📋 Aperçu</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Informations générales et KPIs : nombre de mandats, encours, dernière interaction
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">👥 Contacts</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Liste des personnes associées à cette organisation
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">📄 Mandats</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Contrats de distribution actifs avec cette organisation
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💬 Interactions</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Historique complet : emails, appels, réunions, notes
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">✅ Tâches</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Actions planifiées et en cours liées à cette organisation
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">📝 Notes</div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Notes internes non visibles par le client
            </p>
          </div>
        </div>
      </section>

      {/* Filtrer et rechercher */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 border-b pb-2">
          🔍 Filtrer et rechercher des organisations
        </h2>
        <p className="text-gray-700 dark:text-slate-300">
          Utilisez les <strong>filtres avancés</strong> en haut de la liste pour affiner votre recherche :
        </p>

        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <strong>Type</strong> : Banque, Gestionnaire, Family Office, etc.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <strong>Statut</strong> : Prospect, Client, Inactif, Perdu
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <strong>Date de création</strong> : Cette semaine, ce mois, personnalisée
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <strong>Gestionnaire</strong> : Organisations assignées à un commercial
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <strong>Tags</strong> : Segments personnalisés (VIP, International, etc.)
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-slate-400">
          💡 Vous pouvez combiner plusieurs filtres et sauvegarder vos recherches fréquentes.
        </p>
      </section>

      {/* Exporter */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 border-b pb-2">
          📥 Exporter la liste
        </h2>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">1.</span>
            <div>Appliquez vos filtres si nécessaire</div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">2.</span>
            <div>Cliquez sur <strong>Exporter</strong> en haut à droite</div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">3.</span>
            <div>Choisissez le format : <strong>CSV</strong> ou <strong>Excel</strong></div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">4.</span>
            <div>Sélectionnez les colonnes à inclure</div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-gray-700 dark:text-slate-300">5.</span>
            <div>Cliquez sur <strong>Télécharger</strong></div>
          </li>
        </ol>
      </section>

      {/* Astuces */}
      <section className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-green-900 mb-4">💡 Astuces</h2>
        <ul className="space-y-2 text-green-800">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Utilisez les <strong>tags</strong> pour créer des segments personnalisés (VIP, Zone géographique, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Configurez des <strong>workflows</strong> pour automatiser les relances de prospects inactifs</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Consultez régulièrement l&apos;onglet <strong>Interactions</strong> pour garder le contexte avant un appel</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Liez systématiquement les contacts pour avoir une vision 360° de l&apos;organisation</span>
          </li>
        </ul>
      </section>

      {/* Pièges courants */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-amber-900 mb-4">⚠️ Pièges courants</h2>
        <ul className="space-y-2 text-amber-800">
          <li className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Ne créez pas de doublon ! Utilisez la recherche avant de créer une nouvelle organisation</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Pensez à mettre à jour le <strong>statut</strong> quand la relation évolue (Prospect → Client)</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Assignez un gestionnaire pour éviter qu&apos;une organisation soit &quot;orpheline&quot;</span>
          </li>
        </ul>
      </section>

      {/* Rating */}
      <ArticleRating articleId="guide-organisations" articleTitle="Gérer les Organisations" />

      {/* Guides connexes */}
      <section className="border-t pt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">📚 Guides connexes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/help/guides/personnes"
            className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <span className="font-medium text-gray-900 dark:text-slate-100">👥 Gérer les Contacts</span>
          </Link>
          <Link
            href="/dashboard/help/guides/mandats"
            className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <span className="font-medium text-gray-900 dark:text-slate-100">📄 Mandats de Distribution</span>
          </Link>
          <Link
            href="/dashboard/help/guides/interactions"
            className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <span className="font-medium text-gray-900 dark:text-slate-100">💬 Interactions</span>
          </Link>
          <Link
            href="/dashboard/help/guides/filtres"
            className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <span className="font-medium text-gray-900 dark:text-slate-100">🔍 Filtres Avancés</span>
          </Link>
        </div>
      </section>

      {/* Support */}
      <section className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-gray-700 dark:text-slate-300 mb-3">Besoin d&apos;aide supplémentaire ?</p>
        <Link
          href="/dashboard/help#support"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          💬 Contacter le support
        </Link>
      </section>

      {/* Retour */}
      <section className="text-center">
        <Link
          href="/dashboard/help/guides"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux guides
        </Link>
      </section>
    </div>
  )
}
