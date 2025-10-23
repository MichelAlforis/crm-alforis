# 🧪 GUIDE DE TEST - Abonnements aux Campagnes Email

**Date:** 2025-10-23
**Testeur:** À compléter
**Environnement:** Développement Local (localhost:3010)

---

## ✅ PRÉ-REQUIS

Avant de commencer les tests, assure-toi que :
- [ ] Backend API fonctionne (`http://localhost:8000/api/v1/health` → 200 OK)
- [ ] Frontend fonctionne (`http://localhost:3010`)
- [ ] Tu es connecté avec un compte admin
- [ ] Tu as au moins une campagne créée (ID 3 "Mon brouillon" existe)
- [ ] Tu as au moins une personne (ID 2 "Frédéric Guerin" existe)

---

## 📋 TESTS PARTIE 1 : PAGE PERSON

### Test 6.107 : Section visible sur page Person ⬜

**Étapes:**
1. Va sur `http://localhost:3010/dashboard/people`
2. Clique sur une personne dans la liste (ex: "Frédéric Guerin")
3. Scroll vers le bas après la section "Rattachements"

**Résultat attendu:**
- [ ] Une nouvelle section "Abonnements aux campagnes" est visible
- [ ] L'icône Mail (✉️) apparaît dans le header
- [ ] Le compteur affiche "X campagne(s) active(s)"
- [ ] Un bouton "Abonner à une campagne" est présent

**Capture d'écran:** _[Optionnel]_

---

### Test 6.109 : Bouton "Abonner à une campagne" cliquable ⬜

**Étapes:**
1. Sur la même page, clique sur le bouton "Abonner à une campagne"

**Résultat attendu:**
- [ ] Un modal s'ouvre avec le titre "Abonner à une campagne"
- [ ] Un message d'info bleu s'affiche en haut
- [ ] Une liste déroulante "Campagne *" est présente
- [ ] Deux boutons "Annuler" et "Abonner" sont visibles en bas

---

### Test 6.110 : Modal sélection campagne ⬜

**Étapes:**
1. Dans le modal ouvert, clique sur la liste déroulante "Campagne *"

**Résultat attendu:**
- [ ] Une liste de campagnes s'affiche
- [ ] Au moins la campagne "Mon brouillon (draft)" est visible
- [ ] Les campagnes déjà abonnées n'apparaissent PAS dans la liste

---

### Test 6.112 : Validation abonnement ⬜

**Étapes:**
1. Sélectionne une campagne dans la liste (ex: "Mon brouillon")
2. Clique sur le bouton "Abonner"
3. Attends la réponse de l'API

**Résultat attendu:**
- [ ] Le modal se ferme automatiquement
- [ ] Un toast vert de succès s'affiche : "Abonné à la campagne 'Mon brouillon' avec succès"
- [ ] La liste des abonnements se met à jour automatiquement
- [ ] Le nouvel abonnement apparaît dans la section

---

### Test 6.113 : Liste abonnements actifs affichée ⬜

**Étapes:**
1. Vérifie la section "Abonnements aux campagnes" après l'abonnement

**Résultat attendu:**
- [ ] L'abonnement créé apparaît dans une card
- [ ] Le nom de la campagne est affiché ("Mon brouillon")
- [ ] La date d'abonnement est affichée (ex: "Abonné le 23/10/2025")
- [ ] Un badge vert "Actif" avec icône ✓ est présent
- [ ] Une icône poubelle rouge est visible à droite

---

### Test 6.114 : Bouton désabonnement visible ⬜

**Étapes:**
1. Survole la card d'un abonnement actif
2. Observe le bouton avec l'icône poubelle à droite

**Résultat attendu:**
- [ ] Le bouton devient rouge au survol
- [ ] Le curseur change en "pointer"
- [ ] Une tooltip peut apparaître (optionnel)

---

### Test 6.115 : Désabonnement réussi ⬜

**Étapes:**
1. Clique sur l'icône poubelle d'un abonnement actif
2. Attends la réponse de l'API

**Résultat attendu:**
- [ ] Un toast vert "Désabonnement réussi" s'affiche
- [ ] L'abonnement disparaît de la section "Actifs"
- [ ] L'abonnement apparaît dans la section "Abonnements inactifs" (si visible)
- [ ] Le badge devient gris avec une icône ✗
- [ ] La date de désabonnement est affichée

---

### Test 6.116 : Abonnements inactifs affichés séparément ⬜

**Étapes:**
1. Après avoir désabonné, scroll vers le bas de la section
2. Cherche une section "Abonnements inactifs"

**Résultat attendu:**
- [ ] Un titre "Abonnements inactifs (1)" est visible
- [ ] Les abonnements désabonnés sont affichés en gris
- [ ] Le badge "Inactif" avec icône ✗ est présent
- [ ] La date de désabonnement est affichée
- [ ] Les cards sont moins opaques (60%)

---

## 📋 TESTS PARTIE 2 : PAGE ORGANISATION

### Test 6.108 : Section visible sur page Organisation ⬜

**Étapes:**
1. Va sur `http://localhost:3010/dashboard/organisations`
2. Clique sur une organisation dans la liste
3. Scroll vers le bas après la section "Timeline"

**Résultat attendu:**
- [ ] Une section "Abonnements aux campagnes" est visible
- [ ] Identique à celle de la page Person
- [ ] Le compteur et le bouton sont présents

**Note:** Les tests 6.109 à 6.116 sont identiques pour les organisations, répète-les !

---

## 🔍 TESTS PARTIE 3 : VALIDATION & ERREURS

### Test 6.117 : Validation campaign_id requis ⬜

**Étapes:**
1. Ouvre le modal d'abonnement
2. NE sélectionne AUCUNE campagne
3. Clique directement sur "Abonner"

**Résultat attendu:**
- [ ] Le bouton "Abonner" est désactivé (grisé) tant qu'aucune campagne n'est sélectionnée
- [ ] OU un message d'erreur s'affiche "Veuillez sélectionner une campagne"

---

### Test 6.118 : Aucune campagne disponible ⬜

**Étapes:**
1. Abonne une personne à TOUTES les campagnes existantes
2. Essaye d'ouvrir le modal d'abonnement à nouveau

**Résultat attendu:**
- [ ] Le bouton "Abonner à une campagne" est désactivé
- [ ] OU un message s'affiche "Aucune campagne disponible"
- [ ] La liste déroulante affiche "Aucune campagne disponible"

---

### Test 6.120 : Doublon détecté (réabonnement) ⬜

**Étapes:**
1. Désabonne une personne d'une campagne
2. Réabonne la même personne à la même campagne

**Résultat attendu:**
- [ ] L'abonnement est réactivé (pas d'erreur)
- [ ] Le champ `is_active` passe à `true`
- [ ] Le champ `unsubscribed_at` est remis à `null`
- [ ] Un toast de succès s'affiche normalement

---

### Test 6.121 : Campagne inexistante ⬜

**Ce test nécessite une manipulation manuelle de l'API ou du code - SKIP pour l'instant**

---

## 🚀 TESTS PARTIE 4 : PERFORMANCE & CACHE

### Test 6.122 : Cache React Query invalidé après création ⬜

**Étapes:**
1. Abonne une personne à une campagne
2. Observe la mise à jour de la liste sans recharger la page

**Résultat attendu:**
- [ ] La liste se met à jour IMMÉDIATEMENT après l'abonnement
- [ ] Pas besoin de rafraîchir la page (F5)
- [ ] Le compteur se met à jour automatiquement
- [ ] Les données sont cohérentes

---

### Test 6.123 : Cache invalidé après désabonnement ⬜

**Étapes:**
1. Désabonne une personne d'une campagne
2. Observe la mise à jour de la liste sans recharger

**Résultat attendu:**
- [ ] L'abonnement disparaît immédiatement de la section active
- [ ] Le compteur diminue automatiquement
- [ ] Les données restent cohérentes

---

### Test 6.124 : Temps de réponse API < 200ms ⬜

**Étapes:**
1. Ouvre les DevTools du navigateur (F12)
2. Va dans l'onglet "Network"
3. Filtre sur "Fetch/XHR"
4. Crée un nouvel abonnement
5. Observe la requête POST `/email/campaigns/3/subscriptions`

**Résultat attendu:**
- [ ] La requête se termine en moins de 200ms
- [ ] Le statut HTTP est 201 Created
- [ ] La réponse contient les données enrichies (campaign_name, entity_name, etc.)

---

## 📊 RÉSUMÉ DES TESTS

| Catégorie | Tests | Passés | Échoués | Skip | Taux |
|-----------|-------|--------|---------|------|------|
| Page Person | 7 | 0 | 0 | 0 | 0% |
| Page Organisation | 7 | 0 | 0 | 0 | 0% |
| Validation | 4 | 0 | 0 | 1 | 0% |
| Performance | 3 | 0 | 0 | 0 | 0% |
| **TOTAL** | **21** | **0** | **0** | **1** | **0%** |

---

## 🐛 BUGS TROUVÉS

_Documente ici tous les bugs rencontrés pendant les tests:_

### Bug #1 : [Titre du bug]
- **Sévérité:** 🔴 Critique / ⚠️ Moyen / 🟡 Mineur
- **Description:**
- **Étapes de reproduction:**
- **Résultat attendu:**
- **Résultat obtenu:**
- **Capture d'écran:**

---

## ✅ VALIDATION FINALE

Après avoir complété tous les tests, coche les cases suivantes :

- [ ] Tous les tests UI sont passés (ou bugs documentés)
- [ ] Les performances sont acceptables (< 200ms)
- [ ] Aucun crash ou erreur JavaScript dans la console
- [ ] La fonctionnalité est prête pour la production

**Signature:** ____________________
**Date:** ____________________

---

## 📝 NOTES SUPPLÉMENTAIRES

_Ajoute ici toute remarque, suggestion d'amélioration, ou observation:_

