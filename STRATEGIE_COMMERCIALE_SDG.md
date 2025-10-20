# 🎯 Stratégie Commerciale SDG - Alforis

## 📊 Vue d'ensemble

**Objectif**: Cibler les sociétés de gestion (SDG) françaises accessibles pour un développement commercial réaliste.

**Segmentation stratégique**:
- ❌ **Tier 1-2**: Hors cible (> 10 Md€) - Marché saturé, concurrence intense
- ⭐ **Tier 3**: **CIBLES PRIORITAIRES** (500 M€ - 10 Md€) - Accessible seul
- ⚠️ **Tier 4**: Opportunités secondaires (100 M€ - 500 M€)
- 👁️ **Tier 5**: Veille long-terme (< 100 M€ ou AUM inconnu)

---

## 🎯 Tier 3 - CIBLES PRIORITAIRES (12 sociétés)

### Pourquoi Tier 3?

✅ **Taille accessible**: 500 M€ - 10 Md€
✅ **Capacité d'investissement**: Budget suffisant pour services externes
✅ **Moins saturé**: Moins courtisé que les majors
✅ **Décision plus rapide**: Structures moins bureaucratiques
✅ **Valeur long-terme**: Croissance potentielle importante

### Liste des 12 cibles prioritaires

| # | Société | AUM (Md€) | Téléphone | Website | Contact principal |
|---|---------|-----------|-----------|---------|-------------------|
| 1 | **FINANCIERE DE L'ECHIQUIER** | 9.5 | 01 47 23 90 90 | www.lfde.com | Emmanuelle Mourey-Pelaez (Présidente) |
| 2 | **ECOFI INVESTISSEMENTS** | 8.2 | 01 44 88 39 24 | www.ecofi.fr | Pierre Abadie (Président) |
| 3 | **SYCOMORE ASSET MANAGEMENT** | 7.8 | 01 44 40 16 12 | www.sycomore-am.com | Denis Panel (CEO) |
| 4 | **COVEA FINANCE** | 7.5 | 01 40 06 51 50 | www.covea-finance.fr | François Touati (Président) |
| 5 | **EIFFEL INVESTMENT GROUP** | 6.8 | 01 39 54 35 67 | - | Jean-Marc Tazé (Président) |
| 6 | **ERES GESTION** | 6.7 | 01 49 70 98 88 | www.eres-gestion.com | Philippe Zaouati (Président) |
| 7 | **PALATINE ASSET MANAGEMENT** | 5.8 | 01 55 27 96 06 | www.palatine-am.com | Nathalie Bulckaert (Présidente) |
| 8 | **ELLIPSIS ASSET MANAGEMENT** | 4.4 | 01 78 41 55 00 | www.ellipsis-am.com | Cyril Sraer (Président) |
| 9 | **AURIS GESTION** | 4.3 | 01 42 25 83 40 | - | Cyril Fages (Président) |
| 10 | **AMIRAL GESTION** | 3.5 | 01 47 20 78 18 | www.amiralgestion.fr | François Badelon (Président) |
| 11 | **ANAXIS ASSET MANAGEMENT** | 2.8 | 09 73 87 13 21 | www.anaxiscapital.com | Alexandre Mouthon (CEO) |
| 12 | **IVO CAPITAL PARTNERS** | 1.6 | - | - | Matthieu Rolin (Managing Partner) |

**AUM total cibles**: ~73 Md€

---

## 📁 Fichiers d'import

### 1️⃣ **SDG_FINAL_677_societes_TIERS_STRATEGIQUES.csv**
**Description**: Base complète des 677 SDG avec classification stratégique

**Colonnes**: name, email, phone, website, address, city, country, country_code, category, type, notes, aum, aum_date, **tier**, **pipeline_stage**, **priority**

**Répartition**:
- Tier 1 (Hors cible - Major): 1 société
- Tier 2 (Hors cible - Gros): 8 sociétés
- **Tier 3 (⭐ CIBLE)**: **12 sociétés**
- Tier 4 (Opportunité): 0 sociétés
- Tier 5 (Veille): 656 sociétés

**Pipeline stage**:
- Tier 3: `qualified` (priorité haute)
- Tier 4: `prospect` (à qualifier)
- Autres: `lead` (veille)

---

### 2️⃣ **SDG_TIER3_12_CIBLES_PRIORITAIRES.csv**
**Description**: Extract des 12 SDG Tier 3 uniquement

**Usage**: Liste de prospection prioritaire

---

### 3️⃣ **SDG_TIER3_CONTACTS_IMPORT.csv**
**Description**: 13 contacts clés pour import direct

**Format**: Compatible avec `/api/v1/imports/people/bulk`

**Colonnes**: first_name, last_name, personal_email (=work_email), phone, country_code, language

---

### 4️⃣ **SDG_TIER3_13_CONTACTS.csv**
**Description**: Fichier référence avec toutes les infos contacts

**Colonnes**: first_name, last_name, work_email, work_phone, job_title, organisation_name, aum, is_primary

**Usage**: Pour créer les liens organisation-personne

---

## 🚀 Plan d'action commercial

### Phase 1: Préparation (Semaine 1-2)

- [ ] **Importer les données en production**
  - Organisations (677 SDG)
  - Contacts Tier 3 (13 personnes)
  - Créer les liens organisation-personne

- [ ] **Enrichir les profils Tier 3**
  - Compléter emails manquants
  - Ajouter adresses sièges sociaux
  - Rechercher contacts secondaires (directeurs commerciaux, distribution)

- [ ] **Préparer le pitch**
  - Value proposition adaptée aux SDG mid-size
  - Cas d'usage pertinents
  - Pricing adapté à la taille

### Phase 2: Prospection (Semaine 3-8)

**Approche séquentielle par taille décroissante**:

1. **Top 4** (> 7 Md€): LFDE, Ecofi, Sycomore, Covéa
   - Objectif: 2 RDV obtenus
   - Timing: Semaines 3-4

2. **Mid 4** (5-7 Md€): Eiffel, Eres, Palatine, Ellipsis
   - Objectif: 2 RDV obtenus
   - Timing: Semaines 5-6

3. **Low 4** (1.6-4.3 Md€): Auris, Amiral, Anaxis, IVO
   - Objectif: 3 RDV obtenus
   - Timing: Semaines 7-8

**Canaux**:
- Appels à froid (téléphones directs disponibles)
- LinkedIn InMail (CEO/Présidents)
- Email direct (work_email disponibles)
- Referral si réseau existant

### Phase 3: Qualification (Semaine 9-12)

- [ ] **Rendez-vous découverte**
  - Comprendre besoins
  - Qualifier budget et décision
  - Identifier décideurs additionnels

- [ ] **Proposition commerciale**
  - Offre sur-mesure par cible
  - Pricing adapté à l'AUM
  - POC si pertinent

### Phase 4: Closing (Mois 4-6)

- [ ] **Négociation**
- [ ] **Contractualisation**
- [ ] **Onboarding**

---

## 📈 KPIs de suivi

### Indicateurs d'activité

| KPI | Objectif | Mesure |
|-----|----------|--------|
| Tentatives de contact | 100% (12 SDG) | Nb appels + emails |
| Taux de réponse | 50% (6 SDG) | Nb réponses / tentatives |
| RDV obtenus | 35% (4 RDV) | Nb RDV / cibles contactées |
| Taux de conversion RDV → Proposition | 75% (3 propositions) | Nb propositions / RDV |
| Taux de closing | 33% (1 client) | Nb signés / propositions |

### Indicateurs business

- **AUM sous gestion cible**: 20-30 Md€ (3-4 clients Tier 3)
- **Revenu annuel estimé**: À définir selon pricing
- **Durée cycle de vente**: 3-6 mois

---

## 🎓 Profil des cibles Tier 3

### Caractéristiques communes

✅ **Indépendance**: Majoritairement indépendants (sauf Palatine, Covéa, LFDE)
✅ **Spécialisation**: Souvent spécialisés (ISR, immobilier, alternatives)
✅ **Croissance**: En phase de structuration/scale-up
✅ **Besoins**: Tech, distribution, middle-office, reporting

### Segments par spécialité

| Segment | SDG | Angle d'approche |
|---------|-----|------------------|
| **ISR/ESG** | Sycomore, Ecofi, Eres | Reporting ESG, impact |
| **Multi-actifs** | LFDE, Palatine, Covéa | Solutions intégrées |
| **Alternatifs** | Eiffel, Anaxis, IVO | Suivi performance complexe |
| **Gestion active** | Amiral, Ellipsis, Auris | Outils d'analyse, data |

---

## 🔄 Tier 4-5: Stratégie long-terme

### Tier 4 (100 M€ - 500 M€)

- **Action**: Veille passive
- **Trigger**: Levée de fonds, croissance forte
- **Effort**: 10% du temps commercial

### Tier 5 (< 100 M€ ou inconnu)

- **Action**: Newsletter, content marketing
- **Objectif**: Brand awareness
- **Effort**: Automatisé

---

## ⚠️ Tier 1-2: Pourquoi hors cible?

### Tier 1: Majors (> 50 Md€)

❌ **Amundi (2,240 Md€)**
- Marché saturé
- Équipes internes développées
- Process décisionnel long
- Pricing sous pression

### Tier 2: Gros acteurs (10-50 Md€)

❌ **BNP AM, Lazard, Carmignac, EdR, Candriam, etc.**
- Déjà équipés
- Contrats long-terme en place
- Forte concurrence
- Ressources internes importantes

**Exception**: Garder en veille pour opportunités ponctuelles (appels d'offres, renouvellement contrats)

---

## 📊 Outils CRM pour le suivi

### Dashboard commercial

```sql
-- Tier 3 en cours de prospection
SELECT name, pipeline_stage, owner_id, last_interaction_date
FROM organisations
WHERE tier LIKE '%Tier 3%'
ORDER BY aum DESC;

-- Taux de conversion par Tier
SELECT tier, pipeline_stage, COUNT(*) as count
FROM organisations
WHERE category = 'SDG'
GROUP BY tier, pipeline_stage;

-- Contacts à relancer
SELECT p.first_name, p.last_name, o.name, MAX(oi.date) as last_contact
FROM people p
JOIN person_organization_links pol ON p.id = pol.person_id
JOIN organisations o ON pol.organisation_id = o.id
LEFT JOIN organisation_interactions oi ON o.id = oi.organisation_id
WHERE o.tier LIKE '%Tier 3%'
GROUP BY p.id, o.id
HAVING MAX(oi.date) IS NULL OR MAX(oi.date) < NOW() - INTERVAL '14 days';
```

### Tâches automatiques

- [ ] Relance J+7 si pas de réponse
- [ ] Suivi pipeline hebdomadaire
- [ ] Reporting KPI mensuel
- [ ] Revue stratégie trimestrielle

---

## 🎯 Prochaines étapes immédiates

1. **Attendre que Docker revienne** pour importer en production
2. **Préparer le pitch commercial** adapté aux SDG mid-size
3. **Identifier contacts additionnels** (directeurs commerciaux, distribution)
4. **Lancer prospection Top 4** dès import terminé

---

## 📚 Ressources

- **Fichiers import**: Voir section "Fichiers d'import" ci-dessus
- **Source AUM**: Option Finance 2025, sites web SDG
- **Contact database**: LinkedIn, Pappers, Societe.com
- **Market intel**: AFG, AMF, Funds Magazine

---

**Date**: 2025-10-20
**Version**: 1.0
**Prochaine révision**: Après 1er mois de prospection
