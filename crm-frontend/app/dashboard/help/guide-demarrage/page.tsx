'use client'

import { Rocket, CheckCircle2, ArrowLeft, Building2, Users, MessageSquare, CheckSquare, Zap } from 'lucide-react'
import Link from 'next/link'

export default function GuideDemarrage() {
  return (
    <PageContainer width="default">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
        <Link href="/dashboard/help" className="hover:text-gray-900 dark:hover:text-white dark:text-slate-100 transition">
          Aide
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-slate-100 font-medium">Guide de démarrage</span>
      </nav>

      {/* Header */}
      <header className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-blue-50">
            <Rocket className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">
          Bienvenue dans ALFORIS CRM
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
          Suivez ce guide en 10 minutes pour découvrir les fonctionnalités essentielles et commencer à utiliser le CRM efficacement
        </p>
      </header>

      {/* Objectifs */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-3">
          🎯 Ce que vous allez apprendre
        </h2>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Naviguer dans le CRM et comprendre le tableau de bord</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Créer votre première organisation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Ajouter un contact et le lier à une organisation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Enregistrer votre première interaction</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Créer une tâche de suivi</span>
          </li>
        </ul>
      </div>

      {/* Étape 1 : Découvrir le Dashboard */}
      <section className="space-y-6">
        <div className="border-l-4 border-blue-600 pl-6 py-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-3">
            1. Découvrir le tableau de bord
          </h2>
          <p className="text-gray-700 dark:text-slate-300 mb-4">
            Après connexion, vous arrivez sur votre <strong>Dashboard</strong> qui affiche :
          </p>
          <ul className="space-y-2 text-gray-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">📊</span>
              <span><strong>KPIs</strong> : Nombre d&apos;organisations actives, mandats, interactions récentes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">✅</span>
              <span><strong>Tâches du jour</strong> : Vos actions prioritaires et en retard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">📈</span>
              <span><strong>Activité</strong> : Graphiques de votre activité commerciale</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">🔔</span>
              <span><strong>Notifications</strong> : Alertes importantes</span>
            </li>
          </ul>
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              💡 <strong>Astuce</strong> : Le menu de gauche vous permet d&apos;accéder à toutes les sections : Organisations, Personnes, Mandats, Produits, Workflows, Marketing.
            </p>
          </div>
        </div>
      </section>

      {/* Étape 2 : Créer une organisation */}
      <section className="space-y-6">
        <div className="border-l-4 border-purple-600 pl-6 py-2">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              2. Créer votre première organisation
            </h2>
          </div>
          <p className="text-gray-700 dark:text-slate-300 mb-4">
            Une organisation représente une banque, un gestionnaire d&apos;actifs, ou tout client/prospect avec qui vous travaillez.
          </p>
          <ol className="space-y-4 text-gray-700 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <strong>Étape 1</strong> : Cliquez sur <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded font-mono text-sm">Organisations</span> dans le menu de gauche
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                <strong>Étape 2</strong> : Cliquez sur le bouton <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Nouvelle organisation</span> en haut à droite
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <strong>Étape 3</strong> : Remplissez les informations essentielles :
                <ul className="ml-6 mt-2 space-y-1 text-sm">
                  <li>• <strong>Nom</strong> : Ex: &quot;Banque Dupont&quot;</li>
                  <li>• <strong>Type</strong> : Ex: &quot;Banque&quot;</li>
                  <li>• <strong>Statut</strong> : Ex: &quot;Prospect&quot;</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                <strong>Étape 4</strong> : Cliquez sur <span className="px-2 py-1 bg-green-600 text-white rounded text-sm">Enregistrer</span>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">
              ✅ Bravo ! Votre première organisation est créée. Vous pouvez maintenant lui ajouter des contacts.
            </p>
          </div>
        </div>
      </section>

      {/* Étape 3 : Ajouter un contact */}
      <section className="space-y-6">
        <div className="border-l-4 border-green-600 pl-6 py-2">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              3. Ajouter un contact
            </h2>
          </div>
          <p className="text-gray-700 dark:text-slate-300 mb-3">
            Maintenant, ajoutons une personne de contact dans cette organisation :
          </p>
          <ol className="space-y-4 text-gray-700 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <strong>Depuis la fiche organisation</strong>, cliquez sur l&apos;onglet <strong>Contacts</strong>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                Cliquez sur <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Ajouter un contact</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <strong>Remplissez</strong> :
                <ul className="ml-6 mt-2 space-y-1 text-sm">
                  <li>• <strong>Prénom</strong> : Ex: &quot;Jean&quot;</li>
                  <li>• <strong>Nom</strong> : Ex: &quot;Martin&quot;</li>
                  <li>• <strong>Email</strong> : Ex: &quot;j.martin@banquedupont.fr&quot;</li>
                  <li>• <strong>Fonction</strong> : Ex: &quot;Directeur Commercial&quot;</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                Cliquez sur <strong>Enregistrer</strong>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Étape 4 : Enregistrer une interaction */}
      <section className="space-y-6">
        <div className="border-l-4 border-amber-600 pl-6 py-2">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="h-6 w-6 text-amber-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              4. Enregistrer une interaction
            </h2>
          </div>
          <p className="text-gray-700 dark:text-slate-300 mb-3">
            Gardez une trace de chaque échange avec vos contacts :
          </p>
          <ol className="space-y-4 text-gray-700 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                Cliquez sur <strong>Interactions</strong> dans le menu principal
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                Cliquez sur <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Nouvelle interaction</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <strong>Sélectionnez</strong> :
                <ul className="ml-6 mt-2 space-y-1 text-sm">
                  <li>• <strong>Type</strong> : Appel, Email, Réunion ou Note</li>
                  <li>• <strong>Organisation/Personne</strong> : Liez à Jean Martin</li>
                  <li>• <strong>Résumé</strong> : Ex: &quot;Premier contact téléphonique, intéressé par nos fonds&quot;</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                Cliquez sur <strong>Enregistrer</strong>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800">
              💡 <strong>Astuce</strong> : Les emails envoyés depuis le CRM sont automatiquement enregistrés comme interactions !
            </p>
          </div>
        </div>
      </section>

      {/* Étape 5 : Créer une tâche */}
      <section className="space-y-6">
        <div className="border-l-4 border-red-600 pl-6 py-2">
          <div className="flex items-center gap-3 mb-3">
            <CheckSquare className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              5. Créer une tâche de suivi
            </h2>
          </div>
          <p className="text-gray-700 dark:text-slate-300 mb-3">
            Ne perdez jamais une opportunité grâce aux rappels :
          </p>
          <ol className="space-y-4 text-gray-700 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                Cliquez sur <strong>Tâches</strong> dans le menu principal
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                Cliquez sur <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Nouvelle tâche</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <strong>Définissez</strong> :
                <ul className="ml-6 mt-2 space-y-1 text-sm">
                  <li>• <strong>Titre</strong> : Ex: &quot;Rappeler Jean Martin&quot;</li>
                  <li>• <strong>Description</strong> : Ex: &quot;Envoyer documentation fonds actions&quot;</li>
                  <li>• <strong>Échéance</strong> : Ex: &quot;Demain 14h00&quot;</li>
                  <li>• <strong>Liée à</strong> : Jean Martin / Banque Dupont</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                Cliquez sur <strong>Enregistrer</strong>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-amber-800">
              🔔 Vous recevrez une notification à l&apos;échéance de la tâche !
            </p>
          </div>
        </div>
      </section>

      {/* Félicitations */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border border-green-200">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
          🎉 Félicitations !
        </h2>
        <p className="text-lg text-gray-700 dark:text-slate-300 mb-6 max-w-2xl mx-auto">
          Vous maîtrisez les bases du CRM. Continuez à explorer les fonctionnalités avancées pour booster votre productivité :
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto">
          <Link
            href="/dashboard/help/guides/workflows"
            className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-green-200 hover:border-green-400 hover:shadow-md transition"
          >
            <div className="flex items-center justify-center gap-2 font-semibold text-gray-900 dark:text-slate-100 mb-1">
              <Zap className="h-5 w-5 text-amber-500" />
              <span>Workflows</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Automatisez vos tâches</div>
          </Link>
          <Link
            href="/dashboard/help/guides/marketing"
            className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-green-200 hover:border-green-400 hover:shadow-md transition"
          >
            <div className="flex items-center justify-center gap-2 font-semibold text-gray-900 dark:text-slate-100 mb-1">
              <span>📧</span>
              <span>Marketing</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Campagnes email</div>
          </Link>
          <Link
            href="/dashboard/help/guides/filtres"
            className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-green-200 hover:border-green-400 hover:shadow-md transition"
          >
            <div className="flex items-center justify-center gap-2 font-semibold text-gray-900 dark:text-slate-100 mb-1">
              <span>🔍</span>
              <span>Filtres</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Recherches avancées</div>
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
    </PageContainer>
  )
}
