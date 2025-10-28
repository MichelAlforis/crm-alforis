# 🆘 Plan de Mise en Place - Section Aide CRM ALFORIS

**Date de création:** 24 octobre 2025
**Date de révision:** 24 octobre 2025
**Objectif:** Enrichir et compléter la section d'aide existante pour les **UTILISATEURS FINAUX** du CRM
**Statut:** ✅ Page de base existante - Extension planifiée

---

## ⚠️ IMPORTANT - Public Cible

**Cette aide est destinée aux UTILISATEURS MÉTIER (commerciaux, managers, équipe marketing).**
**PAS aux développeurs !**

Vocabulaire à utiliser : mandats, encours, souscription, performance, lead scoring, etc.
Éviter : API, endpoints, hooks, components, etc.

---

## 🎯 Vue d'Ensemble

### Situation Actuelle

La section Aide du CRM ALFORIS existe déjà avec une base fonctionnelle :
**Fichier:** [crm-frontend/app/dashboard/help/page.tsx](../../crm-frontend/app/dashboard/help/page.tsx)

**✅ Ce qui existe :**
- Header "Comment pouvons-nous vous aider ?"
- Barre de recherche dans FAQ
- 4 Ressources populaires (3 liens morts à activer)
- FAQ avec 8 questions et filtrage par catégorie
- Contact Support (email + chat)

**❌ Ce qui manque :**
- Contenu FAQ insuffisant (8 questions vs 35+ nécessaires)
- Liens morts sur les ressources populaires
- Pas de guides détaillés utilisateurs
- Documentation API inadaptée (pour développeurs)
- Pas d'onboarding nouveaux utilisateurs
- Pas d'aide contextuelle dans l'application

### Architecture Cible

```
/dashboard/help (Page principale - ✅ existante)
  ├─ 🔍 Barre de recherche enrichie
  ├─ 📚 Ressources populaires (4 cartes)
  │    ├─ Guide de démarrage → /dashboard/help/guide-demarrage
  │    ├─ Guides par fonctionnalité → /dashboard/help/guides
  │    ├─ Tutoriels vidéo → /dashboard/help/tutoriels
  │    └─ Support par chat → Chat en direct
  ├─ ❓ FAQ enrichie (35+ questions utilisateur)
  └─ 💬 Contact Support (email + chat + téléphone)
```

---

## 🚀 PHASE 1: Enrichissement FAQ & Contenu (Semaine 1)

**Objectif:** Passer de 8 à 35+ questions FAQ orientées utilisateurs métier

### 1.1 Catégories FAQ Actuelles vs Cible

**Actuelles (8 questions):**
- Général (2)
- Fournisseurs (1)
- Mandats (1)
- Sécurité (1)
- Intégrations (1)
- Facturation (1)
- Données (1)

**Cible (35+ questions):**
- Général (8 questions) ⬆️ +6
- Organisations (6 questions) 🆕
- Personnes/Contacts (5 questions) 🆕
- Mandats (4 questions) ⬆️ +3
- Produits (4 questions) 🆕
- Interactions (4 questions) 🆕
- Workflows (5 questions) 🆕
- Marketing (6 questions) 🆕
- Tâches (3 questions) 🆕
- Sécurité (2 questions) ⬆️ +1
- Données (3 questions) ⬆️ +2
- Intégrations (2 questions) ⬆️ +1
- Facturation (1 question) ✅

### 1.2 Nouvelles Questions à Ajouter (27 questions)

#### Général (+6 questions)

```typescript
{
  category: 'Général',
  question: 'Comment naviguer dans le CRM ?',
  answer: 'Le menu principal sur la gauche vous permet d\'accéder à toutes les sections : Dashboard, Organisations, Personnes, Mandats, Produits, Workflows, Marketing. Cliquez sur une section pour afficher les sous-menus disponibles.'
},
{
  category: 'Général',
  question: 'Comment utiliser la barre de recherche ?',
  answer: 'La barre de recherche en haut permet de trouver rapidement des organisations, personnes, ou mandats. Tapez au moins 3 caractères pour lancer la recherche. Vous pouvez aussi utiliser le raccourci Cmd/Ctrl + K.'
},
{
  category: 'Général',
  question: 'Comment personnaliser mon tableau de bord ?',
  answer: 'Votre dashboard affiche automatiquement vos KPIs principaux : organisations actives, interactions récentes, tâches en cours. Les widgets s\'adaptent selon votre rôle (commercial, manager, marketing).'
},
{
  category: 'Général',
  question: 'Quels sont mes droits d\'accès ?',
  answer: 'Vos droits dépendent de votre rôle (Viewer, User, Manager, Admin). Pour voir vos permissions, allez dans Paramètres > Mon profil. Contactez votre administrateur pour modifier vos accès.'
},
{
  category: 'Général',
  question: 'Comment me déconnecter ?',
  answer: 'Cliquez sur votre avatar en haut à droite, puis sélectionnez "Se déconnecter". Votre session sera automatiquement fermée après 24h d\'inactivité pour des raisons de sécurité.'
},
{
  category: 'Général',
  question: 'Comment modifier mon profil ?',
  answer: 'Cliquez sur votre avatar en haut à droite, puis "Mon profil". Vous pouvez modifier votre nom, email, photo et préférences de notification.'
},
```

#### Organisations (+6 questions nouvelles)

```typescript
{
  category: 'Organisations',
  question: 'Comment créer une organisation ?',
  answer: 'Allez dans Organisations > Nouvelle organisation. Renseignez au minimum le nom et le type d\'organisation (Banque, Gestionnaire d\'actifs, etc.). Vous pourrez compléter les informations plus tard.'
},
{
  category: 'Organisations',
  question: 'Comment lier des personnes à une organisation ?',
  answer: 'Dans la fiche d\'une organisation, allez à l\'onglet "Contacts". Cliquez sur "Ajouter un contact" et sélectionnez une personne existante ou créez-en une nouvelle. Vous pouvez définir sa fonction dans l\'organisation.'
},
{
  category: 'Organisations',
  question: 'Comment suivre l\'activité d\'une organisation ?',
  answer: 'Dans la fiche organisation, l\'onglet "Interactions" affiche toutes les communications (emails, appels, réunions). L\'onglet "Tâches" montre les actions planifiées. Un historique complet est disponible en bas de page.'
},
{
  category: 'Organisations',
  question: 'Comment filtrer ma liste d\'organisations ?',
  answer: 'Utilisez les filtres avancés en haut de la liste : type, statut, date de création, gestionnaire assigné. Vous pouvez combiner plusieurs filtres et sauvegarder vos recherches fréquentes.'
},
{
  category: 'Organisations',
  question: 'Comment exporter ma liste d\'organisations ?',
  answer: 'Cliquez sur "Exporter" en haut à droite de la liste. Choisissez le format (CSV, Excel) et sélectionnez les colonnes à inclure. L\'export se télécharge immédiatement.'
},
{
  category: 'Organisations',
  question: 'Qu\'est-ce que le statut d\'une organisation ?',
  answer: 'Le statut indique où en est la relation : Prospect (découverte), Qualifié (intérêt confirmé), Client (actif), Inactif (dormant), Perdu (opportunité échouée). Modifiez-le depuis la fiche organisation.'
},
```

#### Personnes (+5 questions nouvelles)

```typescript
{
  category: 'Personnes',
  question: 'Comment ajouter un contact ?',
  answer: 'Allez dans Personnes > Nouveau contact. Renseignez nom, prénom et email minimum. Vous pouvez l\'associer directement à une organisation ou le faire plus tard.'
},
{
  category: 'Personnes',
  question: 'Comment voir toutes les interactions avec un contact ?',
  answer: 'Dans la fiche personne, l\'onglet "Historique" affiche toutes les interactions chronologiques : emails envoyés, appels passés, réunions. Les interactions sont aussi créées automatiquement depuis vos emails.'
},
{
  category: 'Personnes',
  question: 'Comment gérer mes listes de contacts ?',
  answer: 'Utilisez les tags pour segmenter vos contacts (VIP, Newsletter, Prospect chaud, etc.). Allez dans Marketing > Listes pour créer des segments dynamiques basés sur des critères (fonction, secteur, activité).'
},
{
  category: 'Personnes',
  question: 'Comment fusionner des contacts en doublon ?',
  answer: 'Cette fonctionnalité sera bientôt disponible. En attendant, contactez le support avec les emails des contacts à fusionner. Notre équipe s\'en chargera manuellement.'
},
{
  category: 'Personnes',
  question: 'Comment importer des contacts en masse ?',
  answer: 'Allez dans Personnes > Importer. Téléchargez le modèle CSV, remplissez vos données (nom, prénom, email obligatoires), puis importez le fichier. Le système détecte et signale les erreurs avant validation.'
},
```

#### Mandats (+3 questions nouvelles)

```typescript
// Garder la question existante + ajouter ces 3
{
  category: 'Mandats',
  question: 'Qu\'est-ce qu\'un mandat de distribution ?',
  answer: 'Un mandat représente un contrat de distribution entre votre société et un fournisseur (banque, gestionnaire d\'actifs). Il définit les produits que vous êtes autorisés à commercialiser et les conditions associées.'
},
{
  category: 'Mandats',
  question: 'Comment suivre la performance d\'un mandat ?',
  answer: 'Dans la fiche mandat, l\'onglet "Performance" affiche les KPIs : encours placés, nombre de clients investis, évolution mensuelle. Les graphiques se mettent à jour automatiquement.'
},
{
  category: 'Mandats',
  question: 'Comment créer un nouveau mandat ?',
  answer: 'Allez dans Mandats > Nouveau mandat. Sélectionnez le fournisseur, définissez le type de mandat (Distribution, Conseil, etc.), la date de début et les produits concernés. Un workflow peut automatiser la création de tâches d\'activation.'
},
```

#### Produits (+4 questions nouvelles)

```typescript
{
  category: 'Produits',
  question: 'Comment ajouter un produit au catalogue ?',
  answer: 'Allez dans Produits > Nouveau produit. Renseignez le nom, le type (OPCVM, Assurance-vie, SCPI, etc.), le fournisseur et l\'ISIN si applicable. Complétez ensuite les détails : frais, performance, risque.'
},
{
  category: 'Produits',
  question: 'Comment suivre la performance d\'un produit ?',
  answer: 'Dans la fiche produit, l\'onglet "Performance" affiche l\'historique de valorisation, les rendements annualisés et la comparaison avec l\'indice de référence. Les données sont mises à jour quotidiennement.'
},
{
  category: 'Produits',
  question: 'Comment voir quels clients ont investi dans un produit ?',
  answer: 'Dans la fiche produit, l\'onglet "Investisseurs" liste tous les clients ayant souscrit ce produit, avec les montants investis et les dates de souscription.'
},
{
  category: 'Produits',
  question: 'Comment comparer plusieurs produits ?',
  answer: 'Dans la liste Produits, cochez les produits à comparer (max 5), puis cliquez sur "Comparer". Un tableau s\'affiche avec les caractéristiques côte à côte : frais, performance, risque, encours.'
},
```

#### Interactions (+4 questions nouvelles)

```typescript
{
  category: 'Interactions',
  question: 'Comment enregistrer une interaction ?',
  answer: 'Allez dans Interactions > Nouvelle interaction. Sélectionnez le type (Appel, Email, Réunion, Note), la personne/organisation concernée, et rédigez un résumé. Vous pouvez créer une tâche de suivi directement.'
},
{
  category: 'Interactions',
  question: 'Les emails sont-ils automatiquement enregistrés ?',
  answer: 'Oui ! Si vous envoyez un email depuis le CRM ou si vous utilisez l\'intégration email (Gmail, Outlook), les échanges sont automatiquement créés comme interactions et associés aux bons contacts.'
},
{
  category: 'Interactions',
  question: 'Comment planifier un rappel après une interaction ?',
  answer: 'Lors de la création d\'une interaction, cochez "Créer une tâche de suivi". Définissez la date et l\'heure du rappel. Vous recevrez une notification et la tâche apparaîtra dans votre liste.'
},
{
  category: 'Interactions',
  question: 'Comment voir toutes mes interactions de la semaine ?',
  answer: 'Allez dans Interactions et utilisez le filtre "Date" pour sélectionner "Cette semaine". Vous pouvez aussi filtrer par type (uniquement appels, uniquement réunions, etc.) et exporter la liste.'
},
```

#### Workflows (+5 questions nouvelles)

```typescript
{
  category: 'Workflows',
  question: 'Qu\'est-ce qu\'un workflow automatisé ?',
  answer: 'Un workflow est une série d\'actions automatiques déclenchées par un événement (création d\'organisation, date spécifique, inactivité). Exemple : envoyer un email de bienvenue 2 jours après création d\'un prospect.'
},
{
  category: 'Workflows',
  question: 'Comment créer mon premier workflow ?',
  answer: 'Allez dans Workflows > Nouveau workflow. Choisissez un déclencheur (ex: "Organisation créée"), définissez des conditions optionnelles, puis ajoutez des actions (envoyer email, créer tâche, assigner utilisateur). Activez-le quand vous êtes prêt.'
},
{
  category: 'Workflows',
  question: 'Puis-je utiliser des modèles de workflows ?',
  answer: 'Oui ! Dans la bibliothèque de workflows (onglet Bibliothèque), vous trouverez des templates prêts à l\'emploi : Relance prospects inactifs, Onboarding nouveau client, Suivi post-réunion. Dupliquez et personnalisez selon vos besoins.'
},
{
  category: 'Workflows',
  question: 'Comment tester un workflow avant de l\'activer ?',
  answer: 'Créez le workflow en mode brouillon, puis testez-le sur une organisation/personne test. Vérifiez dans l\'historique du workflow que les actions se sont bien exécutées. Une fois validé, activez-le pour qu\'il s\'applique automatiquement.'
},
{
  category: 'Workflows',
  question: 'Comment désactiver un workflow ?',
  answer: 'Dans la liste Workflows, basculez le switch de "Actif" à "Inactif" sur le workflow concerné. Les déclenchements en cours se termineront, mais aucun nouveau ne démarrera. Vous pouvez réactiver à tout moment.'
},
```

#### Marketing (+6 questions nouvelles)

```typescript
{
  category: 'Marketing',
  question: 'Comment créer une campagne email ?',
  answer: 'Allez dans Marketing > Campagnes > Nouvelle campagne. Suivez l\'assistant en 4 étapes : 1) Nommez votre campagne, 2) Choisissez ou créez un template, 3) Sélectionnez vos destinataires, 4) Programmez l\'envoi ou envoyez immédiatement.'
},
{
  category: 'Marketing',
  question: 'Comment segmenter mes destinataires ?',
  answer: 'Lors de la création d\'une campagne, utilisez les filtres avancés pour cibler : statut (Client, Prospect), tags, date de dernière interaction, lead score, présence de mandat actif, etc. Vous pouvez combiner jusqu\'à 8 critères.'
},
{
  category: 'Marketing',
  question: 'Comment voir les résultats de ma campagne ?',
  answer: 'Dans Marketing > Campagnes, cliquez sur une campagne envoyée. Vous verrez les KPIs : taux d\'ouverture, taux de clics, désabonnements, erreurs. Le détail par destinataire est disponible en bas de page.'
},
{
  category: 'Marketing',
  question: 'Qu\'est-ce que le lead scoring ?',
  answer: 'Le lead scoring note automatiquement vos contacts de 0 à 100 selon leur engagement : ouvertures d\'emails, clics, réunions, mandats signés. Plus le score est élevé, plus le contact est "chaud" et prioritaire.'
},
{
  category: 'Marketing',
  question: 'Comment créer un template d\'email ?',
  answer: 'Allez dans Marketing > Templates > Nouveau template. Utilisez l\'éditeur visuel pour concevoir votre email. Vous pouvez insérer des variables dynamiques (prénom, nom organisation, etc.) qui seront personnalisées à l\'envoi.'
},
{
  category: 'Marketing',
  question: 'Comment respecter le RGPD dans mes campagnes ?',
  answer: 'Le CRM ajoute automatiquement un lien de désabonnement dans chaque email. Les contacts désabonnés ne recevront plus d\'emails marketing. Dans Paramètres > RGPD, vous pouvez exporter/supprimer les données d\'un contact sur demande.'
},
```

#### Tâches (+3 questions nouvelles)

```typescript
{
  category: 'Tâches',
  question: 'Comment créer une tâche ?',
  answer: 'Allez dans Tâches > Nouvelle tâche. Définissez le titre, la description, la date d\'échéance et assignez-la à vous-même ou un collègue. Vous pouvez lier la tâche à une organisation ou personne pour contexte.'
},
{
  category: 'Tâches',
  question: 'Comment voir mes tâches du jour ?',
  answer: 'Votre Dashboard affiche automatiquement les tâches du jour et en retard. Vous pouvez aussi aller dans Tâches et filtrer par "Aujourd\'hui" ou "Cette semaine". Une notification vous rappelle les tâches à échéance.'
},
{
  category: 'Tâches',
  question: 'Comment créer une tâche récurrente ?',
  answer: 'Cette fonctionnalité arrive prochainement ! En attendant, utilisez un workflow avec déclencheur "Programmé" qui crée automatiquement une tâche tous les lundis par exemple.'
},
```

#### Sécurité (+1 question)

```typescript
// Garder la question existante + ajouter
{
  category: 'Sécurité',
  question: 'Comment changer mon mot de passe ?',
  answer: 'Allez dans Paramètres > Mon profil > Sécurité, puis cliquez sur "Modifier le mot de passe". Saisissez votre mot de passe actuel puis le nouveau (min. 8 caractères, avec majuscules, chiffres et caractères spéciaux).'
},
```

#### Données (+2 questions)

```typescript
// Garder la question existante + ajouter
{
  category: 'Données',
  question: 'Comment importer des données en masse ?',
  answer: 'Allez dans la section concernée (Organisations, Personnes, Produits) et cliquez sur "Importer". Téléchargez le modèle CSV fourni, remplissez vos données en respectant le format, puis importez. Le système valide les données avant insertion.'
},
{
  category: 'Données',
  question: 'Mes données sont-elles sauvegardées ?',
  answer: 'Oui, vos données sont sauvegardées automatiquement toutes les 6 heures sur des serveurs sécurisés en Europe. En cas de problème, nous pouvons restaurer vos données jusqu\'à 30 jours en arrière. Vous pouvez aussi exporter régulièrement pour archivage local.'
},
```

#### Intégrations (+1 question)

```typescript
// Garder la question existante + ajouter
{
  category: 'Intégrations',
  question: 'Comment configurer les webhooks ?',
  answer: 'Allez dans Paramètres > Intégrations > Webhooks. Cliquez sur "Nouveau webhook", définissez l\'URL de destination et sélectionnez les événements à suivre (organisation créée, email envoyé, etc.). Testez la connexion avant d\'activer.'
},
```

### 1.3 Mise à Jour Fichier page.tsx

**Fichier:** `crm-frontend/app/dashboard/help/page.tsx`

**Action:** Remplacer le tableau `faqs` (lignes 22-71) par le nouveau tableau enrichi de 35+ questions.

### 1.4 Amélioration Recherche

Modifier la fonction `filteredFAQs` pour inclure la recherche dans les catégories :

```typescript
const filteredFAQs = faqs.filter((faq) => {
  const matchesSearch =
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase()) // ✅ AJOUT
  const matchesCategory = selectedCategory === 'Tous' || faq.category === selectedCategory
  return matchesSearch && matchesCategory
})
```

### ✅ Livrables Phase 1

- [ ] 35+ questions FAQ (vs 8 actuelles)
- [ ] 13 catégories (vs 7 actuelles)
- [ ] Recherche améliorée incluant catégories
- [ ] Mise à jour `page.tsx` avec nouveau contenu
- [ ] Validation avec utilisateurs test

---

## 📚 PHASE 2: Guides Utilisateur & Pages Détaillées (Semaines 2-3)

**Objectif:** Créer les pages de guides pour activer les liens actuellement morts dans "Ressources populaires"

### 2.1 Mise à Jour Ressources Populaires

**Fichier:** `crm-frontend/app/dashboard/help/page.tsx` (lignes 73-102)

**Modifier le tableau `resources` :**

```typescript
const resources = [
  {
    title: 'Guide de démarrage',
    description: 'Apprenez les bases du CRM en 10 minutes',
    icon: Book,
    link: '/dashboard/help/guide-demarrage', // ✅ ACTIVER
    color: 'blue',
  },
  {
    title: 'Guides par fonctionnalité',
    description: 'Maîtrisez chaque module du CRM', // ✅ MODIFIER
    icon: BookOpen, // ✅ IMPORTER: import { BookOpen } from 'lucide-react'
    link: '/dashboard/help/guides', // ✅ ACTIVER
    color: 'purple',
  },
  {
    title: 'Tutoriels vidéo',
    description: 'Regardez des démonstrations pas à pas',
    icon: Video,
    link: '/dashboard/help/tutoriels', // ✅ ACTIVER (si vidéos disponibles)
    color: 'green',
  },
  {
    title: 'Support par chat',
    description: 'Discutez avec notre équipe en direct',
    icon: MessageCircle,
    link: '#support', // ✅ Scroll vers section support
    color: 'amber',
  },
]

// ❌ RETIRER "Documentation API" (orientée développeurs, pas utilisateurs métier)
```

### 2.2 Structure des Nouvelles Pages

```
crm-frontend/app/dashboard/help/
  ├─ page.tsx (✅ existe - page principale)
  ├─ guide-demarrage/
  │   └─ page.tsx (🆕 Guide de démarrage 10 min)
  ├─ guides/
  │   ├─ page.tsx (🆕 Index des guides)
  │   ├─ organisations/page.tsx (🆕)
  │   ├─ personnes/page.tsx (🆕)
  │   ├─ mandats/page.tsx (🆕)
  │   ├─ produits/page.tsx (🆕)
  │   ├─ interactions/page.tsx (🆕)
  │   ├─ workflows/page.tsx (🆕)
  │   ├─ marketing/page.tsx (🆕)
  │   ├─ filtres/page.tsx (🆕)
  │   └─ exports/page.tsx (🆕)
  └─ tutoriels/
      └─ page.tsx (🆕 Index tutoriels - si vidéos disponibles)
```

### 2.3 Guides à Créer (9 guides utilisateur)

Chaque guide doit suivre une structure simple et visuelle :

1. **Guide: Gérer les Organisations**
   - Créer une organisation
   - Ajouter des contacts
   - Suivre l'activité
   - Filtrer et exporter

2. **Guide: Gérer les Contacts**
   - Ajouter un contact
   - Lier à une organisation
   - Consulter l'historique
   - Segmenter avec tags

3. **Guide: Mandats de Distribution**
   - Créer un mandat
   - Associer des produits
   - Suivre les performances
   - Gérer le portefeuille

4. **Guide: Catalogue Produits**
   - Ajouter un produit
   - Suivre la performance
   - Voir les investisseurs
   - Comparer des produits

5. **Guide: Interactions et Historique**
   - Enregistrer une interaction
   - Créer un rappel
   - Voir l'historique complet
   - Filtrer par type

6. **Guide: Workflows Automatisés**
   - Créer un workflow
   - Utiliser les templates
   - Tester un workflow
   - Activer/désactiver

7. **Guide: Marketing et Campagnes**
   - Créer une campagne email
   - Segmenter les destinataires
   - Analyser les résultats
   - Lead scoring

8. **Guide: Filtres Avancés**
   - Types de filtres disponibles
   - Combiner plusieurs filtres
   - Sauvegarder des recherches
   - Utilisation sur chaque page

9. **Guide: Exports de Données**
   - Exporter en CSV/Excel
   - Sélectionner les colonnes
   - Planifier des exports
   - Archiver les données

### 2.4 Template de Guide Simplifié

Chaque guide utilisera un format simple et visuel :

```markdown
# [Emoji] [Titre du Guide]

**Pour qui ?** [Commercial / Manager / Marketing]
**Temps de lecture:** 5 minutes

---

## 🎯 À quoi ça sert ?

[Description en 2-3 phrases du métier]

---

## 🚀 Comment faire ?

### Étape 1 : [Action]
[Instructions simples avec captures d'écran]

### Étape 2 : [Action]
[Instructions simples avec captures d'écran]

### Étape 3 : [Action]
[Instructions simples avec captures d'écran]

---

## 💡 Astuces

- ✅ [Astuce 1]
- ✅ [Astuce 2]
- ✅ [Astuce 3]

---

## ❓ Questions fréquentes

**Q: [Question courante]**
R: [Réponse simple]

**Q: [Question courante]**
R: [Réponse simple]

---

## 📚 Guides connexes

- [Guide lié 1]
- [Guide lié 2]
```

### ✅ Livrables Phase 2

- [ ] Mise à jour ressources populaires (retrait API docs)
- [ ] Page Guide de Démarrage (10 min)
- [ ] 9 guides fonctionnalités orientés utilisateurs
- [ ] Page index `/guides` listant tous les guides
- [ ] Captures d'écran de l'interface dans chaque guide
- [ ] Validation contenu avec utilisateurs pilotes

---

## 💬 PHASE 3: Support Interactif & Aide Contextuelle (Semaine 4)

**Objectif:** Améliorer l'expérience support avec chat en direct et aide contextuelle

### 3.1 Intégration Chat Support (Intercom ou Crisp)

**Choix recommandé:** Crisp (gratuit, simple, en français)

```bash
npm install crisp-sdk-web
```

**Composant:** `crm-frontend/components/help/CrispChat.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { Crisp } from 'crisp-sdk-web'
import { useAuth } from '@/hooks/useAuth'

export function CrispChat() {
  const { user } = useAuth()

  useEffect(() => {
    // Configurer Crisp
    Crisp.configure(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID!)

    // Identifier l'utilisateur
    if (user) {
      Crisp.user.setEmail(user.email)
      Crisp.user.setNickname(`${user.prenom} ${user.nom}`)
    }

    // Personnaliser les messages
    Crisp.session.setData({
      role: user?.role || 'user',
      created_at: user?.created_at || new Date().toISOString(),
    })
  }, [user])

  return null // Le widget Crisp s'affiche automatiquement
}
```

**Intégration:** `crm-frontend/app/dashboard/layout.tsx`

```typescript
import { CrispChat } from '@/components/help/CrispChat'

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <CrispChat />
    </>
  )
}
```

### 3.2 Amélioration Section Contact Support

**Mise à jour:** `crm-frontend/app/dashboard/help/page.tsx` (section Contact Support)

Ajouter 3 canaux de support (au lieu de 2) :

```typescript
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
      // Ouvrir Crisp
      if (typeof window !== 'undefined' && window.$crisp) {
        window.$crisp.push(['do', 'chat:open'])
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
```

**Import à ajouter:**

```typescript
import { Phone } from 'lucide-react'
```

### 3.3 Bouton d'Aide Flottant (Help Beacon)

**Composant:** `crm-frontend/components/help/HelpBeacon.tsx`

Widget flottant en bas à droite avec aide contextuelle selon la page :

- Sur `/dashboard/organisations` → Suggère "Guide: Gérer les organisations"
- Sur `/dashboard/workflows` → Suggère "Guide: Workflows automatisés"
- Sur `/dashboard/marketing` → Suggère "Guide: Marketing"
- etc.

### 3.4 Tooltips Contextuels

**Composant:** `crm-frontend/components/help/HelpTooltip.tsx`

Ajouter des icônes `ℹ️` à côté des champs complexes dans les formulaires :

- Formulaire création workflow → Tooltip "Type de déclencheur"
- Formulaire création campagne → Tooltip "Lead scoring"
- Filtres avancés → Tooltip "Combiner plusieurs filtres"

### ✅ Livrables Phase 3

- [ ] Chat Crisp intégré et configuré
- [ ] Section Contact Support enrichie (3 canaux)
- [ ] Help Beacon flottant avec aide contextuelle
- [ ] Composant HelpTooltip réutilisable
- [ ] Tooltips ajoutés dans 5+ formulaires clés

---

## 🎓 PHASE 4: Onboarding & Amélioration Continue (Semaine 5+)

**Objectif:** Améliorer l'expérience nouveaux utilisateurs et mesurer l'efficacité

### 4.1 Wizard Onboarding Nouveau Utilisateur

**Composant:** `crm-frontend/components/onboarding/OnboardingWizard.tsx`

Modal qui s'affiche au premier login avec checklist interactive :

1. ✅ Bienvenue dans ALFORIS CRM
2. ✅ Créez votre première organisation
3. ✅ Ajoutez un contact
4. ✅ Enregistrez une interaction
5. ✅ Découvrez les workflows

Progression sauvegardée dans `localStorage` ou base de données utilisateur.

### 4.2 Rating d'Articles FAQ

**Composant:** `crm-frontend/components/help/ArticleRating.tsx`

À la fin de chaque guide, ajouter :

```
Cet article vous a-t-il été utile ?
[👍 Oui]  [👎 Non]

[Si Non] Que pourrions-nous améliorer ?
[____________________________________]
[Envoyer]
```

Stocker les ratings en base pour amélioration continue.

### 4.3 Analytics Basiques

Tracker dans Google Analytics ou Matomo :

- Pages d'aide consultées (quelles guides sont populaires ?)
- Recherches effectuées dans la FAQ
- Temps passé sur chaque guide
- Taux de complétion onboarding

### 4.4 Cycle d'Amélioration Mensuel

1. **Collecter** les données (analytics + ratings + tickets support)
2. **Analyser** les gaps (recherches sans résultats, FAQ manquantes)
3. **Prioriser** les améliorations
4. **Créer/Mettre à jour** le contenu
5. **Déployer** et recommencer

### ✅ Livrables Phase 4

- [ ] Wizard onboarding fonctionnel
- [ ] Système de rating d'articles
- [ ] Analytics configuré (GA ou Matomo)
- [ ] Process d'amélioration mensuel documenté
- [ ] Dashboard de suivi (articles populaires, gaps)

---

## 📋 Récapitulatif des 4 Phases

| Phase | Durée | Focus | Livrables Clés |
|-------|-------|-------|----------------|
| **1. Enrichissement FAQ** | 1 semaine | Contenu utilisateur | 35+ questions FAQ (vs 8), 13 catégories |
| **2. Guides Utilisateur** | 2 semaines | Pages détaillées | Guide démarrage + 9 guides fonctionnalités |
| **3. Support Interactif** | 1 semaine | Chat, beacon, tooltips | Chat Crisp + Help Beacon + tooltips |
| **4. Onboarding & Analytics** | 1 semaine + continu | Mesure + amélioration | Onboarding + ratings + analytics |

**Total:** 5 semaines pour déploiement initial + amélioration continue

---

## 🎯 Critères de Succès

### Métriques Quantitatives

- ✅ **FAQ:** 35+ questions couvrant 100% des fonctionnalités utilisateur
- ✅ **Guides:** 9 guides détaillés avec captures d'écran
- ✅ **Support:** Réduction de 50% des questions répétitives
- ✅ **Onboarding:** >75% de complétion du wizard
- ✅ **Satisfaction:** >4/5 rating moyen des articles

### Métriques Qualitatives

- ✅ Langage simple, orienté utilisateur métier (PAS développeur)
- ✅ Exemples concrets du métier finance/distribution
- ✅ Aide contextuelle non intrusive
- ✅ Support multicanal accessible
- ✅ Onboarding engageant pour nouveaux utilisateurs

---

## 🚀 Prochaines Étapes Immédiates

1. ✅ **Validation du plan** avec product owner
2. 📝 **Phase 1:** Enrichir FAQ (35+ questions) - **1 semaine**
3. 📚 **Phase 2:** Créer guides utilisateur - **2 semaines**
4. 💬 **Phase 3:** Intégrer chat support - **1 semaine**
5. 🎓 **Phase 4:** Onboarding + analytics - **1 semaine**
6. 🔄 **Monitoring:** Cycle amélioration mensuel

---

## 📝 Notes Importantes

### Différences Clés vs Documentation Développeur

- ❌ **RETIRER** "Documentation API" des ressources (pour développeurs)
- ✅ **FOCUS** sur utilisateurs métier : commerciaux, managers, marketeurs
- ✅ **Vocabulaire** métier : mandats, encours, souscription, performance
- ✅ **Exemples** concrets : "Banque Dupont", "Jean Martin", scénarios réels
- ✅ **Guides visuels** avec captures d'écran de l'interface

### Ce qui Existe Déjà et est OK

- ✅ Design de la page principale
- ✅ Barre de recherche fonctionnelle
- ✅ Système FAQ accordion
- ✅ Filtrage par catégorie
- ✅ Section contact support

### Ce qui Doit Être Modifié

- 🔧 FAQ : 8 questions → 35+ questions
- 🔧 Ressources : liens `#` → vraies pages
- 🔧 Retirer "Documentation API" (orientée développeurs)
- 🔧 Activer chat support (Crisp recommandé)
- 🔧 Ajouter canal téléphone dans section support

---

**Statut:** 📋 Plan révisé, adapté à la page existante et orienté UTILISATEURS MÉTIER
**Owner:** Équipe Frontend
**Prochaine revue:** Fin de Phase 1 (enrichissement FAQ)
**Public cible:** Commerciaux, Managers, Équipe Marketing (PAS développeurs)
