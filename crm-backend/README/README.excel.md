// GUIDE IMPORT INVESTISSEURS - EXCEL
// ===================================

/**
 * 🎯 OBJECTIF: Charger RAPIDEMENT tous vos clients existants
 * 
 * Au lieu de créer 100 clients un par un:
 * ❌ 100 fois: Cliquer → Remplir → Créer (30+ minutes)
 * ✅ 1 fois: Uploader Excel → Importer (30 secondes)
 */

// ============= 📋 PRÉREQUIS =============

/**
 * Vous avez besoin de:
 * 1. ✅ Tous vos clients dans Excel ou CSV
 * 2. ✅ Les colonnes: Nom, Email, Téléphone, etc.
 * 3. ✅ Accès à /dashboard/imports/investors
 */

// ============= 📊 FORMAT EXACT DU FICHIER =============

/**
 * OPTION 1: Fichier Excel (.xlsx ou .xls)
 * 
 * Ouvrir Excel et créer les colonnes:
 * 
 * | Nom         | Email            | Téléphone      | Secteur    | Société      | Pipeline      | Type Client   |
 * |-------------|------------------|----------------|------------|--------------|---------------|---------------|
 * | Client A    | a@example.com    | +33123456789   | Finance    | CGPI XYZ     | prospect_froid| cgpi          |
 * | Client B    | b@example.com    | +33987654321   | SaaS       | Wholesale ABC| prospect_tiede| wholesale     |
 * | Client C    | c@example.com    | +33555555555   | E-commerce | Fund DEF     | client        | institutionnel|
 * 
 * ⚠️ IMPORTANT: Avant d'uploader dans l'app:
 *    1. Ouvrir Excel
 *    2. Fichier → Enregistrer sous
 *    3. Format: CSV UTF-8 (*.csv)
 *    4. Puis uploader le .csv dans l'app
 * 
 * OPTION 2: Fichier CSV (.csv)
 * 
 * Créer un fichier texte "clients.csv" avec le contenu:
 * 
 * Nom,Email,Téléphone,Secteur,Société,Pipeline,Type Client,Notes
 * Client A,a@example.com,+33123456789,Finance,CGPI XYZ,prospect_froid,cgpi,Gros potentiel
 * Client B,b@example.com,+33987654321,SaaS,Wholesale ABC,prospect_tiede,wholesale,À relancer
 * Client C,c@example.com,+33555555555,E-commerce,Fund DEF,client,institutionnel,Déjà client
 */

// ============= 🔑 COLONNES DISPONIBLES =============

/**
 * ✅ OBLIGATOIRE:
 * - Nom (ex: "Client A", "CGPI XYZ")
 * 
 * 📝 RECOMMANDÉ:
 * - Email (ex: "a@example.com")
 * - Téléphone (ex: "+33123456789")
 * - Secteur (ex: "Finance", "SaaS", "E-commerce")
 * - Société (ex: "CGPI XYZ")
 * 
 * ⚙️ OPTIONNEL:
 * - Pipeline (valeurs: prospect_froid, prospect_tiede, prospect_chaud, en_negociation, client, inactif)
 *   Par défaut: prospect_froid
 * 
 * - Type Client (valeurs: cgpi, wholesale, institutionnel, autre)
 *   Par défaut: rien
 * 
 * - Notes (texte libre, ex: "Gros potentiel", "À relancer")
 */

// ============= 📥 ÉTAPES D'IMPORT =============

/**
 * ÉTAPE 1: Préparer le fichier Excel
 * ══════════════════════════════════
 * 
 * 1. Ouvrir Excel
 * 2. Créer les colonnes (voir format ci-dessus)
 * 3. Copier-coller vos clients
 * 4. Enregistrer en CSV:
 *    - Fichier → Enregistrer sous
 *    - Format: CSV UTF-8 (*.csv)
 *    - Nom: "mes-clients.csv"
 * 
 * ÉTAPE 2: Aller sur la page d'import
 * ═══════════════════════════════════
 * 
 * 1. Aller sur: http://localhost:3000/dashboard/imports/investors
 * 2. Voir le formulaire d'import
 * 
 * ÉTAPE 3: Uploader le fichier
 * ════════════════════════════
 * 
 * 1. Cliquer "Choisir un fichier"
 * 2. Sélectionner "mes-clients.csv"
 * 3. Cliquer "Ouvrir"
 * 
 * ÉTAPE 4: Vérifier les données
 * ═════════════════════════════
 * 
 * 1. La page affiche un aperçu
 * 2. Vérifier que les colonnes sont correctes
 * 3. Vérifier les erreurs (s'il y en a)
 * 4. Si OK: Cliquer "Importer (X investisseurs)"
 * 
 * ÉTAPE 5: Voir les résultats
 * ═══════════════════════════
 * 
 * 1. Page affiche: "X créés, Y erreurs"
 * 2. Redirect automatique vers la liste des investisseurs
 * 3. Voir vos nouveaux clients dans /dashboard/investors
 */

// ============= ⚠️ ERREURS COURANTES & SOLUTIONS =============

/**
 * ERREUR: "Aucune donnée trouvée dans le fichier"
 * SOLUTION:
 *  - Vérifier que le fichier n'est pas vide
 *  - Vérifier qu'il a au moins 1 ligne de données (+ header)
 *  - Vérifier le format: CSV ou Excel
 * 
 * ERREUR: "Nom requis" (ligne X)
 * SOLUTION:
 *  - Vérifier que la colonne "Nom" existe
 *  - Vérifier que chaque ligne a une valeur dans "Nom"
 * 
 * ERREUR: "Email déjà existant"
 * SOLUTION:
 *  - Cet email est déjà en base de données
 *  - Soit passer cet enregistrement, soit mettre à jour le client existant manuellement
 * 
 * ERREUR: "Fichier invalide"
 * SOLUTION:
 *  - Vérifier que le fichier n'est pas corrompu
 *  - Vérifier le format: .csv ou .xlsx
 *  - Essayer d'ouvrir le fichier dans Excel avant d'uploader
 * 
 * ERREUR: Les données n'apparaissent pas après import
 * SOLUTION:
 *  - Rafraîchir la page (F5)
 *  - Vérifier que l'import a réussi (voir le rapport)
 *  - Vérifier la liste des investisseurs: /dashboard/investors
 */

// ============= 💡 EXEMPLE PRATIQUE =============

/**
 * Vous avez 5 clients dans votre Outlook:
 * 
 * 1. Alice - alice@cgpi.com - +33123456789 - CGPI - prospect_froid
 * 2. Bob - bob@wholesale.com - +33987654321 - Wholesale - en_negociation
 * 3. Charlie - charlie@fund.com - +33555555555 - Fonds - client
 * 4. Diana - (pas d'email) - +33666666666 - Autre - prospect_tiede
 * 5. Eve - eve@example.com - (pas de phone) - Finance - prospect_chaud
 * 
 * Créer le CSV:
 * 
 * Nom,Email,Téléphone,Secteur,Société,Pipeline,Type Client
 * Alice,alice@cgpi.com,+33123456789,Finance,CGPI,prospect_froid,cgpi
 * Bob,bob@wholesale.com,+33987654321,Finance,Wholesale,en_negociation,wholesale
 * Charlie,charlie@fund.com,+33555555555,Finance,Fund,client,institutionnel
 * Diana,,+33666666666,Autre,Autre,prospect_tiede,autre
 * Eve,eve@example.com,,Finance,Finance,prospect_chaud,cgpi
 * 
 * Uploader → Importer → Voilà! 5 clients créés en 30 secondes! ✅
 */

// ============= 🚀 POUR ALLER PLUS LOIN =============

/**
 * Après l'import d'investisseurs:
 * 
 * 1. Importer les Fournisseurs (même processus)
 * 2. Créer les Interactions (manuellement ou import)
 * 3. Commencer avec les KPIs
 * 4. Puis Phase 3: Newsletter
 */

// ============= 📁 FICHIERS CRÉÉS =============

/**
 * [ ] hooks-useImportInvestors.ts
 *     → Copier vers: hooks/useImportInvestors.ts
 * 
 * [ ] components-forms-ImportInvestorsForm.tsx
 *     → Copier vers: components/forms/ImportInvestorsForm.tsx
 * 
 * [ ] app-imports-investors-page.tsx
 *     → Copier vers: app/dashboard/imports/investors/page.tsx
 * 
 * [ ] template-investisseurs.csv
 *     → Garder pour référence (ou partager avec les utilisateurs)
 * 
 * [ ] backend-imports-router.py (OPTIONNEL)
 *     → Si vous voulez optimiser le backend (bulk endpoint)
 */

// ============= ✅ CHECKLIST D'INTÉGRATION =============

/**
 * ÉTAPE 1: TYPES & HOOKS
 * [ ] Ajouter à hooks/index.ts:
 *     export { useImportInvestors } from './useImportInvestors'
 * 
 * ÉTAPE 2: FORMULAIRES
 * [ ] Copier ImportInvestorsForm.tsx vers components/forms/
 * [ ] Mettre à jour components/forms/index.ts:
 *     export { ImportInvestorsForm } from './ImportInvestorsForm'
 * 
 * ÉTAPE 3: PAGES
 * [ ] Créer app/dashboard/imports/ (dossier)
 * [ ] Créer app/dashboard/imports/investors/ (dossier)
 * [ ] Copier app-imports-investors-page.tsx vers app/dashboard/imports/investors/page.tsx
 * 
 * ÉTAPE 4: NAVIGATION (OPTIONNEL)
 * [ ] Ajouter un lien vers /dashboard/imports/investors quelque part
 *     (dans la page investors list par exemple: "Importer en bulk")
 * 
 * ÉTAPE 5: TEST
 * [ ] Créer un fichier CSV test
 * [ ] Aller sur /dashboard/imports/investors
 * [ ] Uploader et tester l'import
 * [ ] Vérifier que les clients apparaissent dans /dashboard/investors
 */

// ============= 🎉 C'EST PRÊT! =============

/**
 * Maintenant vous pouvez:
 * 1. Charger tous vos clients en 30 secondes
 * 2. Ensuite faire des KPIs et newsletter
 * 3. Puis passer en production!
 * 
 * Ques-tions? Relire ce guide!
 */

export {}