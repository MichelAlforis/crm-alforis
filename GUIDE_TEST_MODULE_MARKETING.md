# 📋 Guide de Test - Module Marketing

## 🎯 Objectif
Tester toutes les fonctionnalités du module Marketing incluant CRUD, Export et Import.

---

## ✅ Pré-requis

### Docker Containers
```bash
docker ps
```
Vérifier que ces containers sont UP:
- ✅ v1-api-1 (Backend API) - Port 8000
- ✅ v1-postgres-1 (Database) - Port 5433
- ✅ v1-redis-1 (Cache) - Port 6379

### Frontend
- ✅ Frontend Next.js - Port 3010
- URL: http://localhost:3010

### Backend API
- ✅ Backend FastAPI - Port 8000
- URL: http://localhost:8000
- Swagger: http://localhost:8000/docs

---

## 🧪 Tests à Effectuer

### 1. Test de Connexion
**URL**: http://localhost:3010

**Steps**:
1. Ouvrir le navigateur
2. Aller sur http://localhost:3010
3. Se connecter avec les credentials admin
4. Vérifier la redirection vers /dashboard

**Résultat attendu**: ✅ Connexion réussie, dashboard affiché

---

### 2. Test Navigation Marketing
**URL**: http://localhost:3010/dashboard/marketing

**Steps**:
1. Cliquer sur "Marketing" dans le sidebar
2. Vérifier l'affichage du Hub Marketing
3. Vérifier les 3 onglets: Campagnes, Listes de diffusion, Templates

**Résultat attendu**:
- ✅ Hub Marketing affiché
- ✅ 3 cartes de navigation visibles
- ✅ Statistiques affichées

---

### 3. Test Listes de Diffusion - Lecture (READ)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Cliquer sur "Listes de diffusion"
2. Vérifier l'affichage de la table
3. Vérifier les statistiques en haut

**Résultat attendu**:
- ✅ Table affichée avec colonnes: Nom, Description, Type, Destinataires, Dernière utilisation, Actions
- ✅ Statistiques: Total listes, Total destinataires, Moyenne par liste
- ✅ Boutons: Créer, Importer, Export (CSV/Excel/PDF)

---

### 4. Test Création de Liste (CREATE)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Cliquer sur "Créer une liste"
2. Remplir le formulaire:
   - Nom: "Test Liste Manuelle"
   - Description: "Liste créée pour test"
   - Type: "contacts"
3. Cliquer "Créer"

**Résultat attendu**:
- ✅ Modal s'ouvre
- ✅ Formulaire validé
- ✅ Toast success affiché
- ✅ Liste apparaît dans la table
- ✅ Modal se ferme

---

### 5. Test Modification de Liste (UPDATE)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Cliquer sur l'icône "Edit" d'une liste
2. Modifier le nom: ajouter " - MODIFIÉ"
3. Modifier la description
4. Cliquer "Mettre à jour"

**Résultat attendu**:
- ✅ Modal s'ouvre avec données pré-remplies
- ✅ Modifications sauvegardées
- ✅ Toast success affiché
- ✅ Table mise à jour
- ✅ Modal se ferme

---

### 6. Test Export CSV
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Cliquer sur "CSV"
2. Vérifier le téléchargement du fichier
3. Ouvrir le fichier dans Excel/LibreOffice

**Résultat attendu**:
- ✅ Fichier téléchargé: `listes-diffusion_YYYY-MM-DD.csv`
- ✅ Fichier contient toutes les colonnes
- ✅ Données correctes

**Format attendu**:
```csv
name,description,target_type,filters,recipient_count,is_active,created_at
Test Liste Manuelle,Liste créée pour test,contacts,{},0,true,2025-10-23T...
```

---

### 7. Test Export Excel
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Cliquer sur "Excel"
2. Vérifier le téléchargement du fichier
3. Ouvrir le fichier dans Excel

**Résultat attendu**:
- ✅ Fichier téléchargé: `listes-diffusion_YYYY-MM-DD.xlsx`
- ✅ Formatage Excel correct
- ✅ Colonnes et données correctes

---

### 8. Test Import CSV - Nouvelles Listes
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Fichier de test**: `test_import_fixed.csv`

**Steps**:
1. Cliquer sur "Importer"
2. Vérifier que la modal s'ouvre
3. Cliquer sur "Choisir un fichier"
4. Sélectionner `test_import_fixed.csv`
5. Attendre l'upload automatique
6. Vérifier les résultats affichés

**Résultat attendu**:
- ✅ Modal s'ouvre avec documentation du format
- ✅ Upload se fait automatiquement
- ✅ Loader affiché pendant l'import
- ✅ Résultats affichés:
  - 3 listes créées
  - 0 mises à jour
  - 0 erreurs
- ✅ Toast success affiché
- ✅ Page rafraîchie automatiquement
- ✅ Nouvelles listes visibles dans la table

---

### 9. Test Import CSV - Mise à Jour Existantes
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Modifier le fichier `test_import_fixed.csv`:
   - Changer la description de "Clients Premium TEST"
   - Changer recipient_count à 200
2. Cliquer sur "Importer"
3. Sélectionner le fichier modifié

**Résultat attendu**:
- ✅ Import réussi
- ✅ Résultats affichés:
  - 0 créées
  - 1 mise à jour (Clients Premium TEST)
  - 2 créées (les autres si elles n'existaient pas)
  - 0 erreurs
- ✅ Liste "Clients Premium TEST" mise à jour avec nouvelle description

---

### 10. Test Import - Fichier Invalide (Validation)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Créer un fichier texte `.txt`
2. Cliquer sur "Importer"
3. Essayer de sélectionner le fichier `.txt`

**Résultat attendu**:
- ✅ Input n'accepte que .csv, .xlsx, .xls
- ✅ Fichier .txt non sélectionnable
- ✅ OU Toast error si sélectionné

---

### 11. Test Import - Colonne Manquante (Erreur)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Créer un CSV sans colonne "name":
```csv
description,target_type
Test sans nom,contacts
```
2. Importer ce fichier

**Résultat attendu**:
- ✅ Toast error affiché
- ✅ Message: "La colonne 'name' est obligatoire"
- ✅ Aucune donnée importée

---

### 12. Test Import - Données Invalides (Erreurs Partielles)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Créer un CSV avec données invalides:
```csv
name,description,target_type,filters,recipient_count,is_active
Liste Valid 1,Description,contacts,{},100,true
,Description manquante,contacts,{},50,true
Liste Valid 2,Description,invalid_type,{},75,true
```
2. Importer ce fichier

**Résultat attendu**:
- ✅ Import partiellement réussi
- ✅ Résultats affichés:
  - 2 créées (Liste Valid 1 et 2)
  - 0 mises à jour
  - 1 erreur (ligne sans nom)
- ✅ Toast warning affiché
- ✅ Détails des erreurs affichés dans la modal

---

### 13. Test Suppression de Liste (DELETE)
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. Cliquer sur l'icône "Trash" d'une liste de test
2. Vérifier la modal de confirmation
3. Cliquer "Supprimer"

**Résultat attendu**:
- ✅ Modal de confirmation s'affiche
- ✅ Message clair: "Êtes-vous sûr de vouloir supprimer..."
- ✅ Boutons "Annuler" et "Supprimer"
- ✅ Suppression effectuée
- ✅ Toast success affiché
- ✅ Liste disparaît de la table

---

### 14. Test Workflow Complet: Export → Modify → Import
**URL**: http://localhost:3010/dashboard/marketing/mailing-lists

**Steps**:
1. **Export**: Exporter toutes les listes en CSV
2. **Modify**: Ouvrir le CSV dans Excel
   - Modifier 2 descriptions
   - Changer 2 recipient_count
   - Ajouter 1 nouvelle ligne
3. **Import**: Réimporter le CSV modifié
4. Vérifier les changements dans l'interface

**Résultat attendu**:
- ✅ Export réussi
- ✅ Fichier CSV modifiable dans Excel
- ✅ Import réussi avec:
  - 1 nouvelle liste créée
  - 2+ listes mises à jour
  - 0 erreurs
- ✅ Toutes les modifications visibles dans la table

---

### 15. Test Campagnes Email - Export
**URL**: http://localhost:3010/dashboard/marketing/campaigns

**Steps**:
1. Aller sur la page Campagnes
2. Cliquer sur "CSV", "Excel", "PDF"
3. Vérifier les téléchargements

**Résultat attendu**:
- ✅ 3 fichiers téléchargés
- ✅ Formats corrects
- ✅ Données complètes

---

### 16. Test Campagnes Email - Duplicate
**URL**: http://localhost:3010/dashboard/marketing/campaigns

**Steps**:
1. Créer une campagne de test (si aucune)
2. Cliquer sur l'icône "Copy" (dupliquer)
3. Vérifier la création de la copie

**Résultat attendu**:
- ✅ Nouvelle campagne créée
- ✅ Nom: "Nom Original (Copie)"
- ✅ Status: "draft"
- ✅ Tous les autres champs copiés

---

### 17. Test Campagnes Email - Delete
**URL**: http://localhost:3010/dashboard/marketing/campaigns

**Steps**:
1. Cliquer sur "Trash" d'une campagne draft
2. Confirmer la suppression
3. Essayer de supprimer une campagne "sending"

**Résultat attendu**:
- ✅ Campagne draft supprimée avec succès
- ✅ Campagne "sending" ne peut PAS être supprimée
- ✅ Message d'erreur clair pour les campagnes en cours

---

### 18. Test Templates Email - Export
**URL**: http://localhost:3010/dashboard/marketing/templates

**Steps**:
1. Aller sur la page Templates
2. Cliquer sur "CSV", "Excel", "PDF"

**Résultat attendu**:
- ✅ Export réussi pour tous les formats

---

### 19. Test Templates Email - Delete avec Protection
**URL**: http://localhost:3010/dashboard/marketing/templates

**Steps**:
1. Créer un template
2. Utiliser ce template dans une campagne
3. Essayer de supprimer le template

**Résultat attendu**:
- ✅ Suppression bloquée
- ✅ Message d'erreur: "Impossible de supprimer ce template. Il est utilisé dans X campagne(s)."

---

### 20. Test Page Détail Campagne
**URL**: http://localhost:3010/dashboard/marketing/campaigns/[id]

**Steps**:
1. Cliquer sur "Voir" d'une campagne
2. Vérifier les boutons Edit et Delete
3. Tester "Envoyer email de test"
4. Vérifier toutes les actions

**Résultat attendu**:
- ✅ Page détail affichée
- ✅ Boutons Edit et Delete fonctionnels
- ✅ Modal "Envoyer email de test" s'ouvre (Modal component, pas div custom)
- ✅ Toutes les actions fonctionnent avec useConfirm correct

---

## 📊 Rapport de Test

### Résumé des Tests
| Test | Status | Commentaires |
|------|--------|--------------|
| 1. Connexion | ⏳ À tester | |
| 2. Navigation Marketing | ⏳ À tester | |
| 3. Listes - READ | ⏳ À tester | |
| 4. Listes - CREATE | ⏳ À tester | |
| 5. Listes - UPDATE | ⏳ À tester | |
| 6. Listes - Export CSV | ⏳ À tester | |
| 7. Listes - Export Excel | ⏳ À tester | |
| 8. Listes - Import Nouvelles | ⏳ À tester | |
| 9. Listes - Import Mise à jour | ⏳ À tester | |
| 10. Listes - Import Validation | ⏳ À tester | |
| 11. Listes - Import Erreur Colonne | ⏳ À tester | |
| 12. Listes - Import Erreurs Partielles | ⏳ À tester | |
| 13. Listes - DELETE | ⏳ À tester | |
| 14. Workflow Export→Modify→Import | ⏳ À tester | |
| 15. Campagnes - Export | ⏳ À tester | |
| 16. Campagnes - Duplicate | ⏳ À tester | |
| 17. Campagnes - Delete | ⏳ À tester | |
| 18. Templates - Export | ⏳ À tester | |
| 19. Templates - Delete Protection | ⏳ À tester | |
| 20. Détail Campagne | ⏳ À tester | |

### Statistiques
- **Total Tests**: 20
- **Tests Réussis**: 0 ⏳
- **Tests Échoués**: 0
- **Tests Non Effectués**: 20

---

## 🐛 Bugs Identifiés
_À remplir pendant les tests..._

---

## 💡 Améliorations Suggérées
_À remplir pendant les tests..._

---

## ✅ Checklist Finale

- [ ] Tous les tests passent
- [ ] Aucun bug bloquant
- [ ] Export fonctionnel (CSV, Excel, PDF)
- [ ] Import fonctionnel (CSV, Excel)
- [ ] CRUD complet sur toutes les entités
- [ ] Validation et gestion d'erreurs
- [ ] UX/UI cohérent
- [ ] Documentation à jour
- [ ] Code commité dans git

---

**Date de test**: _______________
**Testeur**: _______________
**Version**: test/chapitre6-campagnes-email
**Commit**: 5c8e195d
