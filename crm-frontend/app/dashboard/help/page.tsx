'use client'

import { useState } from 'react'
import {
  HelpCircle,
  Book,
  BookOpen,
  Video,
  MessageCircle,
  Mail,
  Phone,
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
  // Général (8 questions)
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
    category: 'Général',
    question: 'Comment naviguer dans le CRM ?',
    answer:
      'Le menu principal sur la gauche vous permet d\'accéder à toutes les sections : Dashboard, Organisations, Personnes, Mandats, Produits, Workflows, Marketing. Cliquez sur une section pour afficher les sous-menus disponibles.',
  },
  {
    category: 'Général',
    question: 'Comment utiliser la barre de recherche ?',
    answer:
      'La barre de recherche en haut permet de trouver rapidement des organisations, personnes, ou mandats. Tapez au moins 3 caractères pour lancer la recherche. Vous pouvez aussi utiliser le raccourci Cmd/Ctrl + K.',
  },
  {
    category: 'Général',
    question: 'Comment personnaliser mon tableau de bord ?',
    answer:
      'Votre dashboard affiche automatiquement vos KPIs principaux : organisations actives, interactions récentes, tâches en cours. Les widgets s\'adaptent selon votre rôle (commercial, manager, marketing).',
  },
  {
    category: 'Général',
    question: 'Quels sont mes droits d\'accès ?',
    answer:
      'Vos droits dépendent de votre rôle (Viewer, User, Manager, Admin). Pour voir vos permissions, allez dans Paramètres > Mon profil. Contactez votre administrateur pour modifier vos accès.',
  },
  {
    category: 'Général',
    question: 'Comment me déconnecter ?',
    answer:
      'Cliquez sur votre avatar en haut à droite, puis sélectionnez "Se déconnecter". Votre session sera automatiquement fermée après 24h d\'inactivité pour des raisons de sécurité.',
  },
  {
    category: 'Général',
    question: 'Comment modifier mon profil ?',
    answer:
      'Cliquez sur votre avatar en haut à droite, puis "Mon profil". Vous pouvez modifier votre nom, email, photo et préférences de notification.',
  },

  // Organisations (6 questions)
  {
    category: 'Organisations',
    question: 'Comment créer une organisation ?',
    answer:
      'Allez dans Organisations > Nouvelle organisation. Renseignez au minimum le nom et le type d\'organisation (Banque, Gestionnaire d\'actifs, etc.). Vous pourrez compléter les informations plus tard.',
  },
  {
    category: 'Organisations',
    question: 'Comment lier des personnes à une organisation ?',
    answer:
      'Dans la fiche d\'une organisation, allez à l\'onglet "Contacts". Cliquez sur "Ajouter un contact" et sélectionnez une personne existante ou créez-en une nouvelle. Vous pouvez définir sa fonction dans l\'organisation.',
  },
  {
    category: 'Organisations',
    question: 'Comment suivre l\'activité d\'une organisation ?',
    answer:
      'Dans la fiche organisation, l\'onglet "Interactions" affiche toutes les communications (emails, appels, réunions). L\'onglet "Tâches" montre les actions planifiées. Un historique complet est disponible en bas de page.',
  },
  {
    category: 'Organisations',
    question: 'Comment filtrer ma liste d\'organisations ?',
    answer:
      'Utilisez les filtres avancés en haut de la liste : type, statut, date de création, gestionnaire assigné. Vous pouvez combiner plusieurs filtres et sauvegarder vos recherches fréquentes.',
  },
  {
    category: 'Organisations',
    question: 'Comment exporter ma liste d\'organisations ?',
    answer:
      'Cliquez sur "Exporter" en haut à droite de la liste. Choisissez le format (CSV, Excel) et sélectionnez les colonnes à inclure. L\'export se télécharge immédiatement.',
  },
  {
    category: 'Organisations',
    question: 'Qu\'est-ce que le statut d\'une organisation ?',
    answer:
      'Le statut indique où en est la relation : Prospect (découverte), Qualifié (intérêt confirmé), Client (actif), Inactif (dormant), Perdu (opportunité échouée). Modifiez-le depuis la fiche organisation.',
  },

  // Personnes (5 questions)
  {
    category: 'Personnes',
    question: 'Comment ajouter un contact ?',
    answer:
      'Allez dans Personnes > Nouveau contact. Renseignez nom, prénom et email minimum. Vous pouvez l\'associer directement à une organisation ou le faire plus tard.',
  },
  {
    category: 'Personnes',
    question: 'Comment voir toutes les interactions avec un contact ?',
    answer:
      'Dans la fiche personne, l\'onglet "Historique" affiche toutes les interactions chronologiques : emails envoyés, appels passés, réunions. Les interactions sont aussi créées automatiquement depuis vos emails.',
  },
  {
    category: 'Personnes',
    question: 'Comment gérer mes listes de contacts ?',
    answer:
      'Utilisez les tags pour segmenter vos contacts (VIP, Newsletter, Prospect chaud, etc.). Allez dans Marketing > Listes pour créer des segments dynamiques basés sur des critères (fonction, secteur, activité).',
  },
  {
    category: 'Personnes',
    question: 'Comment fusionner des contacts en doublon ?',
    answer:
      'Cette fonctionnalité sera bientôt disponible. En attendant, contactez le support avec les emails des contacts à fusionner. Notre équipe s\'en chargera manuellement.',
  },
  {
    category: 'Personnes',
    question: 'Comment importer des contacts en masse ?',
    answer:
      'Allez dans Personnes > Importer. Téléchargez le modèle CSV, remplissez vos données (nom, prénom, email obligatoires), puis importez le fichier. Le système détecte et signale les erreurs avant validation.',
  },

  // Mandats (4 questions)
  {
    category: 'Mandats',
    question: 'Comment associer un produit à un mandat ?',
    answer:
      'Dans la page de détail d\'un mandat, cliquez sur "Ajouter un produit", puis sélectionnez le produit dans la liste déroulante. Vous pouvez également définir des détails spécifiques à cette association.',
  },
  {
    category: 'Mandats',
    question: 'Qu\'est-ce qu\'un mandat de distribution ?',
    answer:
      'Un mandat représente un contrat de distribution entre votre société et un fournisseur (banque, gestionnaire d\'actifs). Il définit les produits que vous êtes autorisés à commercialiser et les conditions associées.',
  },
  {
    category: 'Mandats',
    question: 'Comment suivre la performance d\'un mandat ?',
    answer:
      'Dans la fiche mandat, l\'onglet "Performance" affiche les KPIs : encours placés, nombre de clients investis, évolution mensuelle. Les graphiques se mettent à jour automatiquement.',
  },
  {
    category: 'Mandats',
    question: 'Comment créer un nouveau mandat ?',
    answer:
      'Allez dans Mandats > Nouveau mandat. Sélectionnez le fournisseur, définissez le type de mandat (Distribution, Conseil, etc.), la date de début et les produits concernés. Un workflow peut automatiser la création de tâches d\'activation.',
  },

  // Produits (4 questions)
  {
    category: 'Produits',
    question: 'Comment ajouter un produit au catalogue ?',
    answer:
      'Allez dans Produits > Nouveau produit. Renseignez le nom, le type (OPCVM, Assurance-vie, SCPI, etc.), le fournisseur et l\'ISIN si applicable. Complétez ensuite les détails : frais, performance, risque.',
  },
  {
    category: 'Produits',
    question: 'Comment suivre la performance d\'un produit ?',
    answer:
      'Dans la fiche produit, l\'onglet "Performance" affiche l\'historique de valorisation, les rendements annualisés et la comparaison avec l\'indice de référence. Les données sont mises à jour quotidiennement.',
  },
  {
    category: 'Produits',
    question: 'Comment voir quels clients ont investi dans un produit ?',
    answer:
      'Dans la fiche produit, l\'onglet "Investisseurs" liste tous les clients ayant souscrit ce produit, avec les montants investis et les dates de souscription.',
  },
  {
    category: 'Produits',
    question: 'Comment comparer plusieurs produits ?',
    answer:
      'Dans la liste Produits, cochez les produits à comparer (max 5), puis cliquez sur "Comparer". Un tableau s\'affiche avec les caractéristiques côte à côte : frais, performance, risque, encours.',
  },

  // Interactions (4 questions)
  {
    category: 'Interactions',
    question: 'Comment enregistrer une interaction ?',
    answer:
      'Allez dans Interactions > Nouvelle interaction. Sélectionnez le type (Appel, Email, Réunion, Note), la personne/organisation concernée, et rédigez un résumé. Vous pouvez créer une tâche de suivi directement.',
  },
  {
    category: 'Interactions',
    question: 'Les emails sont-ils automatiquement enregistrés ?',
    answer:
      'Oui ! Si vous envoyez un email depuis le CRM ou si vous utilisez l\'intégration email (Gmail, Outlook), les échanges sont automatiquement créés comme interactions et associés aux bons contacts.',
  },
  {
    category: 'Interactions',
    question: 'Comment planifier un rappel après une interaction ?',
    answer:
      'Lors de la création d\'une interaction, cochez "Créer une tâche de suivi". Définissez la date et l\'heure du rappel. Vous recevrez une notification et la tâche apparaîtra dans votre liste.',
  },
  {
    category: 'Interactions',
    question: 'Comment voir toutes mes interactions de la semaine ?',
    answer:
      'Allez dans Interactions et utilisez le filtre "Date" pour sélectionner "Cette semaine". Vous pouvez aussi filtrer par type (uniquement appels, uniquement réunions, etc.) et exporter la liste.',
  },

  // Workflows (5 questions)
  {
    category: 'Workflows',
    question: 'Qu\'est-ce qu\'un workflow automatisé ?',
    answer:
      'Un workflow est une série d\'actions automatiques déclenchées par un événement (création d\'organisation, date spécifique, inactivité). Exemple : envoyer un email de bienvenue 2 jours après création d\'un prospect.',
  },
  {
    category: 'Workflows',
    question: 'Comment créer mon premier workflow ?',
    answer:
      'Allez dans Workflows > Nouveau workflow. Choisissez un déclencheur (ex: "Organisation créée"), définissez des conditions optionnelles, puis ajoutez des actions (envoyer email, créer tâche, assigner utilisateur). Activez-le quand vous êtes prêt.',
  },
  {
    category: 'Workflows',
    question: 'Puis-je utiliser des modèles de workflows ?',
    answer:
      'Oui ! Dans la bibliothèque de workflows (onglet Bibliothèque), vous trouverez des templates prêts à l\'emploi : Relance prospects inactifs, Onboarding nouveau client, Suivi post-réunion. Dupliquez et personnalisez selon vos besoins.',
  },
  {
    category: 'Workflows',
    question: 'Comment tester un workflow avant de l\'activer ?',
    answer:
      'Créez le workflow en mode brouillon, puis testez-le sur une organisation/personne test. Vérifiez dans l\'historique du workflow que les actions se sont bien exécutées. Une fois validé, activez-le pour qu\'il s\'applique automatiquement.',
  },
  {
    category: 'Workflows',
    question: 'Comment désactiver un workflow ?',
    answer:
      'Dans la liste Workflows, basculez le switch de "Actif" à "Inactif" sur le workflow concerné. Les déclenchements en cours se termineront, mais aucun nouveau ne démarrera. Vous pouvez réactiver à tout moment.',
  },

  // Marketing (6 questions)
  {
    category: 'Marketing',
    question: 'Comment créer une campagne email ?',
    answer:
      'Allez dans Marketing > Campagnes > Nouvelle campagne. Suivez l\'assistant en 4 étapes : 1) Nommez votre campagne, 2) Choisissez ou créez un template, 3) Sélectionnez vos destinataires, 4) Programmez l\'envoi ou envoyez immédiatement.',
  },
  {
    category: 'Marketing',
    question: 'Comment segmenter mes destinataires ?',
    answer:
      'Lors de la création d\'une campagne, utilisez les filtres avancés pour cibler : statut (Client, Prospect), tags, date de dernière interaction, lead score, présence de mandat actif, etc. Vous pouvez combiner jusqu\'à 8 critères.',
  },
  {
    category: 'Marketing',
    question: 'Comment voir les résultats de ma campagne ?',
    answer:
      'Dans Marketing > Campagnes, cliquez sur une campagne envoyée. Vous verrez les KPIs : taux d\'ouverture, taux de clics, désabonnements, erreurs. Le détail par destinataire est disponible en bas de page.',
  },
  {
    category: 'Marketing',
    question: 'Qu\'est-ce que le lead scoring ?',
    answer:
      'Le lead scoring note automatiquement vos contacts de 0 à 100 selon leur engagement : ouvertures d\'emails, clics, réunions, mandats signés. Plus le score est élevé, plus le contact est "chaud" et prioritaire.',
  },
  {
    category: 'Marketing',
    question: 'Comment créer un template d\'email ?',
    answer:
      'Allez dans Marketing > Templates > Nouveau template. Utilisez l\'éditeur visuel pour concevoir votre email. Vous pouvez insérer des variables dynamiques (prénom, nom organisation, etc.) qui seront personnalisées à l\'envoi.',
  },
  {
    category: 'Marketing',
    question: 'Comment respecter le RGPD dans mes campagnes ?',
    answer:
      'Le CRM ajoute automatiquement un lien de désabonnement dans chaque email. Les contacts désabonnés ne recevront plus d\'emails marketing. Dans Paramètres > RGPD, vous pouvez exporter/supprimer les données d\'un contact sur demande.',
  },

  // Tâches (3 questions)
  {
    category: 'Tâches',
    question: 'Comment créer une tâche ?',
    answer:
      'Allez dans Tâches > Nouvelle tâche. Définissez le titre, la description, la date d\'échéance et assignez-la à vous-même ou un collègue. Vous pouvez lier la tâche à une organisation ou personne pour contexte.',
  },
  {
    category: 'Tâches',
    question: 'Comment voir mes tâches du jour ?',
    answer:
      'Votre Dashboard affiche automatiquement les tâches du jour et en retard. Vous pouvez aussi aller dans Tâches et filtrer par "Aujourd\'hui" ou "Cette semaine". Une notification vous rappelle les tâches à échéance.',
  },
  {
    category: 'Tâches',
    question: 'Comment créer une tâche récurrente ?',
    answer:
      'Cette fonctionnalité arrive prochainement ! En attendant, utilisez un workflow avec déclencheur "Programmé" qui crée automatiquement une tâche tous les lundis par exemple.',
  },

  // Sécurité (2 questions)
  {
    category: 'Sécurité',
    question: 'Comment activer la double authentification ?',
    answer:
      'La double authentification sera bientôt disponible. Allez dans Paramètres > Sécurité, puis activez l\'option "Double authentification". Vous devrez scanner un QR code avec votre application d\'authentification.',
  },
  {
    category: 'Sécurité',
    question: 'Comment changer mon mot de passe ?',
    answer:
      'Allez dans Paramètres > Mon profil > Sécurité, puis cliquez sur "Modifier le mot de passe". Saisissez votre mot de passe actuel puis le nouveau (min. 8 caractères, avec majuscules, chiffres et caractères spéciaux).',
  },

  // Données (3 questions)
  {
    category: 'Données',
    question: 'Comment exporter mes données ?',
    answer:
      'Vous pouvez exporter vos données au format CSV ou Excel depuis chaque section (Organisations, Personnes, Mandats, Produits, Interactions). Cliquez sur le bouton "Exporter" en haut à droite de la liste, sélectionnez le format et les colonnes souhaitées.',
  },
  {
    category: 'Données',
    question: 'Comment importer des données en masse ?',
    answer:
      'Allez dans la section concernée (Organisations, Personnes, Produits) et cliquez sur "Importer". Téléchargez le modèle CSV fourni, remplissez vos données en respectant le format, puis importez. Le système valide les données avant insertion.',
  },
  {
    category: 'Données',
    question: 'Mes données sont-elles sauvegardées ?',
    answer:
      'Oui, vos données sont sauvegardées automatiquement toutes les 6 heures sur des serveurs sécurisés en Europe. En cas de problème, nous pouvons restaurer vos données jusqu\'à 30 jours en arrière. Vous pouvez aussi exporter régulièrement pour archivage local.',
  },

  // Intégrations (2 questions)
  {
    category: 'Intégrations',
    question: 'Quelles intégrations sont disponibles ?',
    answer:
      'Actuellement, le CRM prend en charge les intégrations Webhook pour connecter vos outils externes. Les intégrations natives Gmail, Outlook, Slack et Zapier arrivent prochainement.',
  },
  {
    category: 'Intégrations',
    question: 'Comment configurer les webhooks ?',
    answer:
      'Allez dans Paramètres > Intégrations > Webhooks. Cliquez sur "Nouveau webhook", définissez l\'URL de destination et sélectionnez les événements à suivre (organisation créée, email envoyé, etc.). Testez la connexion avant d\'activer.',
  },

  // Facturation (1 question)
  {
    category: 'Facturation',
    question: 'Comment télécharger mes factures ?',
    answer:
      'Le téléchargement des factures sera disponible une fois l\'intégration Stripe activée. Vous pourrez alors accéder à toutes vos factures depuis Paramètres > Abonnement & facturation.',
  },
]

const resources = [
  {
    title: 'Guide de démarrage',
    description: 'Apprenez les bases du CRM en 10 minutes',
    icon: Book,
    link: '/dashboard/help/guide-demarrage',
    color: 'blue',
  },
  {
    title: 'Guides par fonctionnalité',
    description: 'Maîtrisez chaque module du CRM',
    icon: BookOpen,
    link: '/dashboard/help/guides',
    color: 'purple',
  },
  {
    title: 'Tutoriels vidéo',
    description: 'Regardez des démonstrations pas à pas',
    icon: Video,
    link: '/dashboard/help/tutoriels',
    color: 'green',
  },
  {
    title: 'Support par chat',
    description: 'Discutez avec notre équipe en direct',
    icon: MessageCircle,
    link: '#support',
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
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
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
      <section id="support" className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-full bg-blue-100 p-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Vous ne trouvez pas ce que vous cherchez ?
        </h2>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto text-center">
          Notre équipe support est disponible du lundi au vendredi de 9h à 18h pour répondre à toutes vos questions
        </p>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* Email */}
          <a
            href="mailto:support@alforis.fr"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition"
          >
            <Mail className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-gray-900">Email</span>
            <span className="text-sm text-gray-600">support@alforis.fr</span>
            <span className="text-xs text-gray-500">Réponse sous 24h</span>
          </a>

          {/* Chat */}
          <button
            onClick={() => {
              // Ouvrir le chat (Crisp/Intercom à intégrer)
              if (typeof window !== 'undefined' && (window as any).$crisp) {
                ;(window as any).$crisp.push(['do', 'chat:open'])
              }
            }}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition"
          >
            <MessageCircle className="h-6 w-6 text-green-600" />
            <span className="font-semibold text-gray-900">Chat en direct</span>
            <span className="text-sm text-gray-600">Assistance immédiate</span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 font-medium">En ligne</span>
            </span>
          </button>

          {/* Téléphone */}
          <a
            href="tel:+33123456789"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition"
          >
            <Phone className="h-6 w-6 text-purple-600" />
            <span className="font-semibold text-gray-900">Téléphone</span>
            <span className="text-sm text-gray-600">01 23 45 67 89</span>
            <span className="text-xs text-gray-500">Lun-Ven 9h-18h</span>
          </a>
        </div>

        <div className="text-center text-sm text-gray-600">
          Pour les urgences techniques, contactez-nous à{' '}
          <a href="mailto:support-urgent@alforis.fr" className="text-blue-600 hover:underline font-medium">
            support-urgent@alforis.fr
          </a>
        </div>
      </section>
    </div>
  )
}
