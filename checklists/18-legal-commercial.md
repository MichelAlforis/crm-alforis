# 📋 Chapitre 18 - Conformité Légale & Commercial

**Version :** 1.0
**Date de création :** 28 Octobre 2025
**Status :** ⬜ À faire (0/4 - 0%)
**Priorité :** 🔴 CRITIQUE - Bloquant pour commercialisation

---

## 🎯 Objectif

Valider tous les aspects légaux et de conformité requis avant la commercialisation du CRM Alforis auprès de clients externes.

**Contexte :** Le CRM est actuellement en usage interne. Pour le commercialiser comme solution SaaS, il est obligatoire de mettre en place un cadre juridique complet.

---

## 📊 Vue d'ensemble

### État actuel
- ✅ **RGPD Technique :** Anonymisation automatique, consentements, logs audit (100%)
- ✅ **RC Pro :** Assurance responsabilité civile professionnelle (déjà souscrite)
- ❌ **CGV/CGU :** Conditions générales non rédigées (0%)
- ❌ **DPA :** Data Processing Agreement non rédigé (0%)

### Score de conformité : 2/4 (50%) ⚠️

---

## 🔴 Tests Critiques (4 items)

### 1. CGV/CGU - Conditions Générales (BLOQUANT)

**Priorité :** 🔴 P0 - Bloquant commercial
**Budget estimé :** 2 000 - 5 000 €
**Délai estimé :** 2-4 semaines

#### Objectif
Rédiger des conditions générales de vente (CGV) et d'utilisation (CGU) conformes au droit français et européen pour un SaaS B2B.

#### Éléments obligatoires à inclure

**CGV (Conditions Générales de Vente) :**
- [ ] Identification de l'éditeur (Alforis Finance - SIREN, adresse, RCS)
- [ ] Description détaillée des services (forfaits, fonctionnalités, limites)
- [ ] Tarification (montants HT/TTC, modalités de paiement, facturation)
- [ ] Durée du contrat (engagement initial, renouvellement, résiliation)
- [ ] Obligations de l'éditeur (disponibilité SLA, support, mises à jour)
- [ ] Obligations du client (usage licite, responsabilité des données)
- [ ] Responsabilités et limitations (clause limitative, force majeure)
- [ ] Propriété intellectuelle (droits d'auteur, licences, marques)
- [ ] Résiliation (préavis, motifs, conséquences)
- [ ] Droit applicable et juridiction compétente

**CGU (Conditions Générales d'Utilisation) :**
- [ ] Objet et acceptation des CGU
- [ ] Accès au service (inscription, identifiants, sécurité)
- [ ] Utilisation autorisée du service
- [ ] Interdictions (revente, reverse engineering, spam)
- [ ] Données personnelles et RGPD (renvoi vers DPA + Politique de confidentialité)
- [ ] Cookies et traceurs
- [ ] Support technique (canaux, délais de réponse)
- [ ] Disponibilité du service (maintenance, pannes)
- [ ] Modifications des CGU
- [ ] Résiliation du compte

#### Actions requises

1. **Recherche avocat spécialisé SaaS**
   - Profil recherché : Cabinet spécialisé droit numérique + RGPD
   - Expérience : Rédaction CGV/CGU pour SaaS B2B (fintech/CRM)
   - Recommandation : Demander au réseau, annuaire IACF, CNB
   - Budget : 2 000 - 5 000 € (rédaction + 2 révisions)

2. **Brief avocat - Informations à fournir**
   - Présentation Alforis Finance (activité, CA, effectifs, clients)
   - Description technique du CRM (architecture, hébergement, sécurité)
   - Modèle commercial (tarifs, forfaits, période d'essai)
   - Public cible (CGP, CGPI, courtiers - B2B uniquement)
   - Hébergement données (France/UE, infrastructure Hetzner)
   - Sous-traitants (Resend pour emails, autres prestataires)
   - SLA souhaité (disponibilité, temps de réponse support)

3. **Validation interne**
   - Revue juridique par direction Alforis
   - Validation technique (SLA réaliste, engagements techniques)
   - Validation commerciale (cohérence avec offres, tarifs)

4. **Publication et intégration**
   - Créer pages `/legal/cgv` et `/legal/cgu` sur le frontend
   - Ajouter liens footer (visible toutes pages)
   - Checkbox acceptation obligatoire à l'inscription
   - Versionning des CGV/CGU (log acceptation par utilisateur)

#### Validation ✅

- [ ] CGV rédigées par avocat spécialisé et validées par direction
- [ ] CGU rédigées par avocat spécialisé et validées par direction
- [ ] Pages `/legal/cgv` et `/legal/cgu` publiées sur le site
- [ ] Checkbox acceptation obligatoire à l'inscription fonctionnelle
- [ ] Liens footer présents et accessibles depuis toutes les pages

**Status :** ❌ Non démarré (0%)

---

### 2. DPA - Data Processing Agreement (BLOQUANT)

**Priorité :** 🔴 P0 - Obligatoire RGPD
**Budget estimé :** Inclus dans mission avocat CGV/CGU (ou 500-1000 € séparé)
**Délai estimé :** 1-2 semaines (parallèle CGV/CGU)

#### Objectif
Rédiger un Data Processing Agreement (Contrat de Sous-Traitance RGPD) conforme à l'Article 28 du RGPD.

#### Contexte réglementaire
Selon le RGPD, tout prestataire SaaS qui traite des données personnelles pour le compte de ses clients est un **sous-traitant** au sens de l'Article 28. Un DPA (ou CST - Contrat de Sous-Traitance) est **obligatoire** entre Alforis (sous-traitant) et chaque client (responsable de traitement).

#### Éléments obligatoires à inclure (Article 28 RGPD)

**Partie 1 - Objet et définitions**
- [ ] Objet du contrat (traitement de données personnelles via CRM)
- [ ] Définitions RGPD (données personnelles, traitement, responsable, sous-traitant)
- [ ] Nature et finalité du traitement (CRM B2B - gestion contacts clients)
- [ ] Catégories de données traitées (identité, contact, données financières prospects)
- [ ] Catégories de personnes concernées (prospects, clients du client)
- [ ] Durée du traitement (durée du contrat + conservation)

**Partie 2 - Obligations du sous-traitant (Alforis)**
- [ ] Traiter les données uniquement sur instruction documentée du responsable
- [ ] Garantir la confidentialité des personnes autorisées à traiter les données
- [ ] Mettre en œuvre mesures techniques et organisationnelles (sécurité)
- [ ] Respecter les conditions de recours à un sous-traitant ultérieur (ex: Resend)
- [ ] Aide au responsable (réponse aux demandes des personnes concernées)
- [ ] Aide au responsable (notification violations de données, AIPD, etc.)
- [ ] Suppression ou restitution des données à la fin du contrat
- [ ] Mise à disposition des informations nécessaires pour démontrer la conformité

**Partie 3 - Mesures de sécurité**
- [ ] Chiffrement des données (at rest: PostgreSQL TDE, in transit: HTTPS/TLS 1.3)
- [ ] Contrôles d'accès (authentification JWT, RBAC, 2FA optionnel)
- [ ] Sauvegarde et restauration (backups quotidiens, retention 30j)
- [ ] Journalisation et audit (logs accès, logs modifications RGPD)
- [ ] Détection incidents (monitoring, alertes, intrusion detection)
- [ ] Plan de réponse aux incidents (procédure violation de données)

**Partie 4 - Sous-traitants ultérieurs**
- [ ] Liste des sous-traitants autorisés (Hetzner hébergement, Resend emails)
- [ ] Engagement identique du sous-traitant ultérieur
- [ ] Notification préalable de tout changement de sous-traitant
- [ ] Droit d'opposition du responsable de traitement

**Partie 5 - Droits des personnes concernées**
- [ ] Procédure de réponse aux demandes d'accès (export données)
- [ ] Procédure de rectification (modification via UI)
- [ ] Procédure d'effacement (anonymisation automatique ou manuelle)
- [ ] Procédure d'opposition et limitation du traitement
- [ ] Délai de réponse (sous 1 mois, extensible à 3 mois)

**Partie 6 - Transferts de données hors UE**
- [ ] Déclaration absence de transfert hors UE (hébergement France/Allemagne)
- [ ] Si transfert nécessaire : mécanismes de protection (SCC, BCR, etc.)

**Partie 7 - Violation de données**
- [ ] Obligation de notification sous 48h au responsable de traitement
- [ ] Contenu notification (nature, catégories, nombre de personnes, conséquences)
- [ ] Assistance à la notification CNIL si nécessaire (dans les 72h)

**Partie 8 - Audit et contrôle**
- [ ] Droit d'audit du responsable de traitement (préavis 15 jours)
- [ ] Mise à disposition documentation (politiques, logs, certificats)
- [ ] Coopération avec autorités de contrôle (CNIL)

**Partie 9 - Durée et résiliation**
- [ ] Durée du DPA (alignée sur CGV)
- [ ] Sort des données à la fin (suppression sous 30 jours ou restitution)
- [ ] Certificat de destruction des données

#### Actions requises

1. **Demander template DPA à l'avocat CGV/CGU**
   - Option 1 : Inclure DPA dans mission globale (recommandé)
   - Option 2 : Commander séparément (500-1000 € si avocat différent)
   - Template standard mais personnalisé (sous-traitants, mesures sécurité)

2. **Compléter annexes techniques**
   - Annexe 1 : Description traitement (nature, finalité, catégories)
   - Annexe 2 : Mesures techniques et organisationnelles (détail sécurité)
   - Annexe 3 : Liste sous-traitants ultérieurs (Hetzner, Resend, autres)
   - Annexe 4 : Procédures (gestion demandes RGPD, violation données)

3. **Intégration au processus commercial**
   - DPA signé obligatoire avant activation compte client
   - Stocker signature électronique (DocuSign, Yousign, ou scan PDF)
   - Notification automatique en cas changement sous-traitant (email)

4. **Publication et accessibilité**
   - Page `/legal/dpa` avec template téléchargeable (PDF)
   - Lien dans footer + email onboarding nouveaux clients
   - Espace client : accès au DPA signé (download PDF)

#### Validation ✅

- [ ] DPA rédigé conforme Article 28 RGPD (validé avocat)
- [ ] Annexes techniques complétées (traitement, sécurité, sous-traitants)
- [ ] Template DPA publié sur `/legal/dpa` (PDF téléchargeable)
- [ ] Processus signature électronique mis en place (DocuSign/Yousign)
- [ ] DPA signé requis avant activation compte (workflow commercial)

**Status :** ❌ Non démarré (0%)

---

### 3. Politique de Confidentialité (OBLIGATOIRE)

**Priorité :** 🔴 P0 - Obligatoire RGPD
**Budget estimé :** Inclus dans mission avocat (ou 300-500 € séparé)
**Délai estimé :** 3-5 jours

#### Objectif
Rédiger une Politique de Confidentialité (Privacy Policy) conforme aux Articles 13 et 14 du RGPD.

#### Différence avec le DPA
- **DPA :** Relations B2B (Alforis ↔ Client entreprise)
- **Politique de Confidentialité :** Relations B2C (Alforis ↔ Utilisateurs finaux du CRM)

Même si le CRM est B2B, les **utilisateurs finaux** (employés des clients) sont des personnes physiques dont les données sont traitées (nom, email, logs connexion). La politique de confidentialité les informe de leurs droits.

#### Éléments obligatoires (Articles 13/14 RGPD)

**Identification du responsable de traitement**
- [ ] Identité et coordonnées Alforis Finance (SIREN, adresse, email DPO)
- [ ] Coordonnées du délégué à la protection des données (DPO - si désigné)

**Finalités et base légale du traitement**
- [ ] Finalité 1 : Gestion du compte utilisateur (base légale : exécution contrat)
- [ ] Finalité 2 : Support technique (base légale : intérêt légitime)
- [ ] Finalité 3 : Sécurité et prévention fraude (base légale : intérêt légitime)
- [ ] Finalité 4 : Amélioration du produit (base légale : consentement - analytics optionnel)

**Catégories de données collectées**
- [ ] Données d'identification (nom, prénom, email, téléphone)
- [ ] Données de connexion (IP, user agent, logs d'activité)
- [ ] Données professionnelles (entreprise, fonction, rôle)
- [ ] Données de navigation (cookies techniques - session, auth)

**Destinataires des données**
- [ ] Personnel autorisé Alforis (support, dev, ops)
- [ ] Sous-traitants (Hetzner hébergement, Resend emails, monitoring)
- [ ] Autorités légales (sur réquisition judiciaire uniquement)

**Transferts hors UE**
- [ ] Déclaration : Aucun transfert hors UE (hébergement France/Allemagne)
- [ ] Si analytics US (Google Analytics) : Mention + mécanisme protection (DPF)

**Durée de conservation**
- [ ] Données compte utilisateur : Durée du contrat + 1 an (prescription)
- [ ] Logs de connexion : 12 mois (sécurité)
- [ ] Logs d'activité RGPD : 3 ans (conformité)
- [ ] Données anonymisées : Illimité (statistiques)

**Droits des personnes concernées**
- [ ] Droit d'accès : Export données personnelles (JSON/PDF)
- [ ] Droit de rectification : Modification profil utilisateur
- [ ] Droit à l'effacement : Suppression compte + anonymisation
- [ ] Droit d'opposition : Opt-out analytics (si mis en place)
- [ ] Droit à la limitation : Désactivation compte temporaire
- [ ] Droit à la portabilité : Export format structuré (JSON)
- [ ] Modalités exercice : Email dpo@alforis.com ou via interface CRM
- [ ] Délai de réponse : 1 mois (extensible à 3 mois si complexe)
- [ ] Droit de réclamation CNIL : Lien + adresse CNIL

**Cookies et traceurs**
- [ ] Cookies strictement nécessaires (session, auth) : Exemptés consentement
- [ ] Cookies analytics (si mis en place) : Consentement préalable requis
- [ ] Durée de conservation cookies : 13 mois max
- [ ] Gestion des cookies : Bandeau conforme CNIL (accept/reject/customize)

**Mesures de sécurité**
- [ ] Chiffrement HTTPS/TLS 1.3
- [ ] Mots de passe hashés (bcrypt/argon2)
- [ ] Authentification forte (JWT + optionnel 2FA)
- [ ] Sauvegardes chiffrées
- [ ] Journalisation accès et modifications

**Modifications de la politique**
- [ ] Notification utilisateurs en cas modification substantielle (email)
- [ ] Versionning de la politique (date dernière MàJ visible)
- [ ] Historique accessible (optionnel mais recommandé)

#### Actions requises

1. **Rédaction par avocat (ou template CNIL adapté)**
   - Option 1 : Inclure dans mission globale avocat CGV/CGU/DPA (recommandé)
   - Option 2 : Utiliser générateur CNIL + adaptation (gratuit mais risqué)
   - Option 3 : LegalPlace/Captain Contrat (200-500 € - qualité moyenne)

2. **Désigner un DPO (Data Protection Officer)**
   - Obligatoire si : traitement à grande échelle ou catégories sensibles
   - Pour CRM B2B : Probablement non obligatoire (< 250 employés)
   - Recommandé quand même : Désigner DPO interne ou externe (mutualisé)
   - Coût externe : 500-1500 €/an (mutualisé) ou 3000-8000 €/an (dédié)

3. **Publication et accessibilité**
   - Page `/legal/privacy` ou `/legal/confidentialite`
   - Lien footer (toutes pages)
   - Popup première connexion (obligation information)
   - Email envoyé après inscription (trace information)

4. **Mécanismes exercice des droits**
   - Email dpo@alforis.com ou privacy@alforis.com (créer alias)
   - Formulaire contact dédié RGPD dans l'interface utilisateur
   - Export données automatique : Endpoint `/api/v1/users/me/export`
   - Suppression compte automatique : Endpoint `/api/v1/users/me` (DELETE)

#### Validation ✅

- [ ] Politique de confidentialité rédigée conforme RGPD (Articles 13/14)
- [ ] DPO désigné (interne ou externe) et coordonnées publiées
- [ ] Page `/legal/privacy` publiée et accessible footer
- [ ] Popup information première connexion fonctionnelle
- [ ] Mécanismes exercice droits opérationnels (export, suppression, email DPO)

**Status :** ❌ Non démarré (0%)

---

### 4. RC Pro - Assurance Responsabilité Civile Professionnelle (✅ VALIDÉ)

**Priorité :** 🔴 P0 - Obligatoire commercial
**Budget :** Variable (1000-5000 €/an selon CA et garanties)
**Status :** ✅ **DÉJÀ SOUSCRITE** (confirmé par utilisateur)

#### Objectif
Disposer d'une assurance RC Pro couvrant les risques liés à l'édition et la commercialisation d'un logiciel SaaS.

#### Garanties requises

**Responsabilité civile exploitation**
- [x] Dommages causés aux tiers dans le cadre de l'activité
- [x] Dommages matériels et immatériels
- [x] Défense et recours

**Responsabilité civile professionnelle**
- [x] Faute, erreur, omission dans la prestation de service
- [x] Perte de données client
- [x] Interruption de service (si SLA contractuel)

**Cyber-risques (optionnel mais recommandé pour SaaS)**
- [ ] À vérifier : Couverture cyber-attaque et violation de données
- [ ] À vérifier : Frais de notification RGPD
- [ ] À vérifier : Frais de gestion de crise cyber

**Plafonds de garantie recommandés**
- Plafond minimum : 500 000 € (PME)
- Plafond recommandé : 1 000 000 - 2 000 000 € (SaaS)
- Franchise typique : 500 - 2 000 € par sinistre

#### Actions requises

1. **Vérifier garanties actuelles RC Pro Alforis**
   - Demander copie contrat + conditions générales
   - Vérifier que l'activité "Édition SaaS/CRM" est bien couverte
   - Vérifier plafonds de garantie (min 500k€)
   - Vérifier si extension cyber-risques (sinon, envisager souscription)

2. **Mentionner dans CGV**
   - Clause : "L'éditeur dispose d'une assurance RC Pro auprès de [Assureur] couvrant les dommages liés à l'exploitation du Service, à hauteur de [Montant] €"
   - Attestation d'assurance disponible sur demande

3. **Renouveler annuellement**
   - Mettre rappel calendrier (30 jours avant échéance)
   - Ajuster plafonds si croissance CA ou clients (scaling)

#### Validation ✅

- [x] RC Pro souscrite et en cours de validité (**CONFIRMÉ**)
- [ ] Garanties vérifiées (édition SaaS couverte, plafond ≥ 500k€)
- [ ] Extension cyber-risques évaluée (recommandé si non souscrit)
- [ ] Mention RC Pro dans CGV rédigée (à faire lors rédaction CGV)
- [ ] Rappel renouvellement calendrier (échéance + notification)

**Status :** ✅ Souscrite (vérification garanties à compléter)

---

## 📋 Checklist globale de conformité

### Documents juridiques obligatoires

- [ ] **CGV** - Conditions Générales de Vente (avocat spécialisé)
- [ ] **CGU** - Conditions Générales d'Utilisation (avocat spécialisé)
- [ ] **DPA** - Data Processing Agreement / Contrat sous-traitance RGPD (avocat)
- [ ] **Politique de Confidentialité** - Privacy Policy conforme Articles 13/14 RGPD
- [ ] **Mentions Légales** - Éditeur, hébergeur, directeur publication (template)
- [ ] **Politique Cookies** - Si analytics/tracking (conforme CNIL)
- [x] **RC Pro** - Assurance responsabilité civile professionnelle (✅ souscrite)

### Processus opérationnels

- [ ] **Désignation DPO** - Délégué Protection Données (interne ou externe)
- [ ] **Registre traitements RGPD** - Article 30 (obligatoire > 250 employés ou données sensibles)
- [ ] **Procédure violation données** - Notification CNIL sous 72h
- [ ] **Procédure exercice droits** - Réponse sous 1 mois (accès, rectif, effacement)
- [ ] **Contrats sous-traitants** - DPA avec Hetzner, Resend, autres (vérifier existence)
- [ ] **Audits sécurité** - Pentest ou audit annuel (recommandé)

### Intégration technique

- [ ] **Pages légales frontend** - `/legal/cgv`, `/legal/cgu`, `/legal/dpa`, `/legal/privacy`
- [ ] **Footer liens** - CGV, CGU, Politique confidentialité, Mentions légales (toutes pages)
- [ ] **Checkbox acceptation CGV/CGU** - Obligatoire à l'inscription (avec log horodaté)
- [ ] **Popup confidentialité** - Information RGPD première connexion
- [ ] **Bandeau cookies** - Si analytics (accept/reject/customize conforme CNIL)
- [ ] **Email DPO** - dpo@alforis.com ou privacy@alforis.com (créer alias)
- [ ] **Export données utilisateur** - Endpoint API `/api/v1/users/me/export`
- [ ] **Suppression compte utilisateur** - Endpoint API `/api/v1/users/me` DELETE + anonymisation

### Monitoring conformité (déjà en place)

- [x] **Monitoring RGPD** - Dashboard `/dashboard/monitoring` (compliance_rate, anonymized)
- [x] **Logs audit RGPD** - Traçabilité modifications données personnelles
- [x] **Anonymisation auto** - Script cron (contacts inactifs 18+ mois)
- [x] **Champs RGPD** - is_anonymized, gdpr_consent, gdpr_consent_date (Person/Organisation)

---

## 🎯 Plan d'action recommandé

### Phase 1 - Urgent (Semaines 1-2)

**Budget total :** 2 500 - 6 000 €
**Délai :** 2-4 semaines

1. **Rechercher et contacter avocat spécialisé SaaS**
   - Brief complet Alforis + CRM (activité, technique, commercial)
   - Demander devis global : CGV + CGU + DPA + Politique Confidentialité
   - Négocier : 2 révisions incluses + template DPA réutilisable

2. **Vérifier RC Pro**
   - Demander copie contrat + attestation en cours
   - Vérifier couverture "Édition SaaS" + plafond ≥ 500k€
   - Si besoin : Souscrire extension cyber-risques

3. **Décider DPO**
   - Option 1 : DPO interne (désigner collaborateur formé - coût formation 500-1000 €)
   - Option 2 : DPO externe mutualisé (500-1500 €/an - LegalPlace, RGPD Express)
   - Option 3 : DPO externe dédié (3000-8000 €/an - cabinet spécialisé)

### Phase 2 - Rédaction (Semaines 2-4)

**Délai :** 2-3 semaines (parallèle avec avocat)

1. **Préparer annexes techniques pour avocat**
   - Annexe DPA : Liste sous-traitants (Hetzner, Resend, autres)
   - Annexe DPA : Mesures sécurité détaillées (chiffrement, sauvegardes, logs)
   - Annexe CGV : Description forfaits (fonctionnalités, limites, tarifs)
   - Annexe CGV : SLA (disponibilité %, temps réponse support)

2. **Rédiger documents simples (si non délégué à avocat)**
   - Mentions Légales (template standard adaptable - 1h)
   - Politique Cookies si analytics (template CNIL - 2h)

### Phase 3 - Intégration (Semaines 4-6)

**Délai :** 1-2 semaines
**Effort dev :** 3-5 jours

1. **Créer pages légales frontend**
   - Route `/legal/cgv` (markdown ou CMS)
   - Route `/legal/cgu` (markdown ou CMS)
   - Route `/legal/dpa` (markdown + PDF téléchargeable)
   - Route `/legal/privacy` (markdown ou CMS)
   - Route `/legal/mentions` (markdown ou CMS)
   - Route `/legal/cookies` (si analytics)

2. **Intégration workflow inscription**
   - Checkbox "J'accepte les CGV et CGU" (required, link vers docs)
   - Log acceptation en BDD (user_id, timestamp, version_cgv, version_cgu, ip)
   - Popup politique confidentialité première connexion (dismiss + log)

3. **Intégration footer**
   - Liens : CGV | CGU | Politique de confidentialité | Mentions légales | DPA
   - Visible sur toutes les pages (layout principal)
   - Responsive mobile

4. **Mécanismes RGPD utilisateur**
   - Endpoint GET `/api/v1/users/me/export` → Export JSON toutes données
   - Endpoint DELETE `/api/v1/users/me` → Anonymisation + suppression compte
   - Email DPO créé : dpo@alforis.com (alias vers responsable)
   - Page `/account/privacy` : Exercice droits (export, suppression, contact DPO)

### Phase 4 - Validation (Semaine 6)

**Délai :** 3-5 jours

1. **Revue juridique interne**
   - Direction Alforis valide tous documents
   - Vérification cohérence CGV ↔ offres commerciales
   - Vérification cohérence DPA ↔ architecture technique

2. **Tests techniques**
   - Tester workflow inscription (checkbox CGV/CGU fonctionnelle)
   - Tester export données utilisateur (JSON valide)
   - Tester suppression compte (anonymisation effective)
   - Vérifier tous liens footer (200 OK, pas 404)
   - Vérifier responsive mobile pages légales

3. **Communication interne**
   - Former équipe commerciale (CGV, DPA, processus signature)
   - Former équipe support (procédure demandes RGPD)
   - Mettre à jour documentation interne

---

## 📊 Budget total estimé

| Poste | Budget | Priorité | Status |
|-------|--------|----------|--------|
| **Avocat SaaS** (CGV + CGU + DPA + Privacy) | 2 000 - 5 000 € | 🔴 P0 | ❌ À faire |
| **DPO externe mutualisé** (1 an) | 500 - 1 500 € | 🟡 P1 | ❌ À faire |
| **Développement frontend** (pages légales) | 0 € (interne) | 🔴 P0 | ❌ À faire |
| **Vérification RC Pro** (gratuit si déjà souscrite) | 0 € | 🟢 P2 | ⚠️ Vérifier |
| **Extension cyber RC Pro** (optionnel) | 300 - 1 000 €/an | 🟡 P1 | ⬜ Optionnel |
| **Signature électronique** (DocuSign/Yousign) | 10 - 25 €/sign ou 300 €/an | 🟡 P1 | ⬜ Optionnel |
| **Audit sécurité/pentest** (recommandé) | 2 000 - 8 000 € | 🟢 P2 | ⬜ Optionnel |

**Total minimum (obligatoire) :** 2 500 - 6 500 €
**Total recommandé (avec optionnels) :** 5 000 - 15 000 €

---

## ⚠️ Risques si non-conformité

### Risques juridiques

1. **Absence CGV/CGU**
   - Impossibilité de poursuivre client en cas litige (contrat invalide)
   - Impossibilité de limiter responsabilité (dommages illimités)
   - Impossibilité de résilier compte abusif (pas de base légale)

2. **Absence DPA (RGPD)**
   - Sanction CNIL : Jusqu'à 10M€ ou 2% CA mondial (Article 83 RGPD)
   - Nullité contrats clients (défaut de conformité RGPD)
   - Perte confiance clients B2B (dealbreaker pour grands comptes)

3. **Absence Politique Confidentialité**
   - Sanction CNIL : Jusqu'à 20M€ ou 4% CA mondial (violation Article 13/14)
   - Obligation information transparente non respectée

4. **Absence RC Pro**
   - Engagement responsabilité personnelle dirigeants (patrimoine personnel)
   - Incapacité indemniser client en cas sinistre (faillite entreprise)
   - Refus souscription par grands comptes (clause obligatoire appels d'offres)

### Risques commerciaux

1. **Perte de confiance**
   - Clients B2B exigent conformité RGPD (audit due diligence)
   - Grands comptes (CGP, banques, assurances) refusent contrat sans DPA
   - Impossibilité répondre à appels d'offres (CGV/DPA requis)

2. **Blocage croissance**
   - Marketplace SaaS (Capterra, Appvizer) exigent CGV publiques
   - Intégrateurs/revendeurs refusent sans cadre juridique clair
   - Impossibilité lever fonds (due diligence investisseurs bloquée)

3. **Réputation**
   - Réputation "amateur" si absence CGV/CGU/DPA
   - Comparaison défavorable vs concurrents conformes
   - Bouche-à-oreille négatif secteur (CGPI, courtiers)

---

## ✅ Critères de validation globale

**Le CRM Alforis est considéré commercialisable lorsque :**

- [ ] **Documents juridiques publiés et accessibles**
  - CGV, CGU, DPA, Politique Confidentialité visibles footer
  - Versions PDF téléchargeables (DPA, CGV)
  - Mentions légales complètes

- [ ] **Processus commercial conforme**
  - Acceptation CGV/CGU obligatoire à l'inscription (checkbox + log)
  - Signature DPA avant activation compte client (DocuSign/Yousign ou scan)
  - Email onboarding avec liens documents juridiques

- [ ] **Mécanismes RGPD opérationnels**
  - DPO désigné (coordonnées publiées)
  - Export données automatique (endpoint API)
  - Suppression compte/anonymisation automatique (endpoint API)
  - Email DPO fonctionnel (dpo@alforis.com)

- [ ] **Assurances en ordre**
  - RC Pro en cours de validité (attestation disponible)
  - Garanties vérifiées (édition SaaS couverte, plafond ≥ 500k€)
  - Mention RC Pro dans CGV

- [ ] **Validation interne**
  - Direction Alforis valide tous documents juridiques
  - Équipe commerciale formée (CGV, DPA, workflow)
  - Équipe support formée (demandes RGPD, incidents)

---

## 📚 Ressources utiles

### Organisations et autorités

- **CNIL** : https://www.cnil.fr (guides RGPD, générateurs, modèles)
- **IACF** : Institut des Avocats Conseils Fiscaux (annuaire avocats spécialisés)
- **CNB** : Conseil National des Barreaux (annuaire avocats)

### Templates et générateurs

- **CNIL - Modèle Registre RGPD** : https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement
- **CNIL - Guide sous-traitant** : https://www.cnil.fr/fr/sous-traitant-quelles-sont-vos-obligations
- **CNIL - Outil PIA** : Privacy Impact Assessment (AIPD - si données sensibles)

### Prestataires juridiques

- **LegalPlace** : CGV/CGU SaaS (200-500 €) - Qualité moyenne mais rapide
- **Captain Contrat** : Idem (300-600 €)
- **RGPD Express** : DPO externe mutualisé (600-1200 €/an)
- **Avocat spécialisé** : Recherche manuelle (2-5k€ mais qualité supérieure)

### Prestataires techniques

- **DocuSign** : Signature électronique (25 €/signature ou forfait)
- **Yousign** : Signature électronique française (10 €/signature ou forfait)
- **Axeptio / Didomi** : Bandeau cookies conforme CNIL (gratuit ou 50-200 €/mois)

---

**Score actuel :** 2/4 items validés (50%)
**Bloquant commercialisation :** Oui (CGV/CGU/DPA manquants)
**Prochaine étape :** Contacter avocat spécialisé SaaS pour mission globale

---

**Dernière mise à jour :** 28 Octobre 2025
