# 📋 SLA - Service Level Agreement - CRM Alforis

**Éditeur** : ALFORIS FINANCE (SIREN 943 007 229)
**Service** : CRM Alforis (crm.alforis.fr)
**Version** : 1.0
**Date** : 28 Octobre 2025
**Révision** : Trimestrielle

---

## 🎯 Engagement de Disponibilité

### Disponibilité du Service

**Objectif de disponibilité : 99,5% par mois calendaire**

| Forfait | Disponibilité garantie | Temps d'indisponibilité max/mois | Compensation |
|---------|------------------------|-----------------------------------|--------------|
| **Solo** | 99,0% | 7,2 heures | Avoir proportionnel |
| **Team** | 99,5% | 3,6 heures | Avoir proportionnel + extension gratuite 1 mois |
| **Enterprise** | 99,9% | 43 minutes | Avoir proportionnel + 2 mois gratuits |

**Calcul de disponibilité** :
```
Disponibilité = ((Heures totales - Heures indispo) / Heures totales) × 100
```

**Exclusions** (ne comptent pas comme indisponibilité) :
- ✅ Maintenance programmée (notifiée 48h à l'avance)
- ✅ Force majeure (catastrophe naturelle, cyberattaque d'ampleur nationale)
- ✅ Problèmes côté client (DNS, réseau local, navigateur)
- ✅ Attaques DDoS ciblées (protection best-effort)

### Fenêtres de Maintenance

**Maintenance programmée** :
- 📅 Fréquence : Maximum 1 fois par mois
- ⏰ Horaire : Dimanche 2h-5h (heure de Paris)
- 📧 Notification : Email 48h à l'avance
- ⏱️ Durée max : 3 heures

**Maintenance d'urgence** (sécurité critique) :
- Peut être effectuée sans préavis
- Notification en temps réel (email + status page)
- Durée minimisée (< 30 minutes objectif)

---

## ⚡ Performance & Temps de Réponse

### Temps de Réponse API

| Endpoint | Target | Max acceptable |
|----------|--------|----------------|
| **GET /api/v1/health** | < 50ms | < 200ms |
| **GET /api/v1/people** (liste) | < 300ms | < 1s |
| **POST /api/v1/people** (création) | < 500ms | < 2s |
| **GET /api/v1/dashboards/stats** | < 800ms | < 3s |
| **Export CSV** (1000 lignes) | < 5s | < 15s |

**Mesure** : P95 (95e percentile) sur 24h glissantes

### Temps de Chargement Frontend

| Page | Target | Max acceptable |
|------|--------|----------------|
| **Page d'accueil** | < 2s | < 5s |
| **Dashboard** | < 3s | < 8s |
| **Liste contacts** (50 items) | < 2s | < 6s |

**Mesure** : First Contentful Paint (FCP) depuis Paris, connexion 4G

---

## 🆘 Support Client

### Canaux de Support

| Canal | Disponibilité | Délai de réponse |
|-------|---------------|------------------|
| **Email** (support@alforis.fr) | 24/7 | Voir tableau ci-dessous |
| **Chat** (widget CRM) | Lun-Ven 9h-18h | < 2h ouvrées |
| **Téléphone** (Enterprise) | Lun-Ven 9h-18h | < 30 min |
| **Status page** (status.crm.alforis.fr) | 24/7 | Temps réel |

### Temps de Réponse Support Email

| Forfait | Sévérité P0<br/>(Service Down) | Sévérité P1<br/>(Bug majeur) | Sévérité P2<br/>(Bug mineur) | Sévérité P3<br/>(Question) |
|---------|-------------------------------|----------------------------|----------------------------|---------------------------|
| **Solo** | 4h ouvrées | 24h ouvrées | 48h ouvrées | 72h ouvrées |
| **Team** | 2h ouvrées | 12h ouvrées | 24h ouvrées | 48h ouvrées |
| **Enterprise** | 1h (24/7) | 4h ouvrées | 12h ouvrées | 24h ouvrées |

**Heures ouvrées** : Lundi-Vendredi 9h-18h (heure de Paris), hors jours fériés français

### Classification Sévérité

**P0 - Critique** :
- Service complètement indisponible (HTTP 5xx sur toutes les pages)
- Perte de données
- Faille de sécurité active

**P1 - Majeur** :
- Fonctionnalité principale inutilisable (impossible de créer contacts, d'envoyer emails)
- Performance dégradée >50% (pages >10s)
- Bug affectant >20% des utilisateurs

**P2 - Mineur** :
- Bug affectant une fonctionnalité secondaire
- Workaround disponible
- UI/UX problème cosmétique

**P3 - Question** :
- Demande de fonctionnalité
- Question sur utilisation
- Documentation

### Temps de Résolution

| Sévérité | Forfait Solo | Forfait Team | Forfait Enterprise |
|----------|--------------|--------------|-------------------|
| **P0** | 24h | 12h | 4h |
| **P1** | 5 jours | 3 jours | 1 jour |
| **P2** | 10 jours | 7 jours | 3 jours |
| **P3** | Best effort | Best effort | 5 jours |

**Résolution** = Fix déployé en production (pas seulement diagnostic)

---

## 💾 Sauvegardes & Restauration

### Politique de Sauvegarde

| Type | Fréquence | Rétention | Stockage |
|------|-----------|-----------|----------|
| **Backup complet** | Quotidien (3h du matin) | 30 jours | Local + Offsite (Backblaze B2) |
| **Backup incrémentiel** | Toutes les 6h | 7 jours | Local |
| **Snapshots DB** | Avant chaque déploiement | 7 jours | Local |

### Temps de Restauration

| Scénario | RTO (Recovery Time) | RPO (Recovery Point) |
|----------|---------------------|---------------------|
| **Crash serveur** | < 4 heures | < 24 heures |
| **Corruption DB** | < 2 heures | < 6 heures |
| **Erreur utilisateur** (suppression) | < 30 minutes | Temps réel |
| **Datacenter détruit** | < 8 heures | < 24 heures |

**RTO** : Temps pour remettre service en ligne
**RPO** : Perte de données maximale acceptable

### Demande de Restauration

**Procédure** :
1. Email à support@alforis.fr avec objet "RESTAURATION URGENTE"
2. Préciser: date/heure souhaitée, données affectées
3. Confirmation par notre équipe (ETA communiqué)
4. Restauration effectuée + rapport envoyé

**Coûts** :
- Solo/Team : Gratuit (1 fois/mois max)
- Enterprise : Illimité gratuit
- Au-delà : €50/restauration

---

## 🔒 Sécurité & Conformité

### Certifications & Audits

| Item | Status | Dernière révision |
|------|--------|-------------------|
| **RC Pro** (Responsabilité Civile) | ✅ Actif | 2025-01-15 |
| **RGPD** (Conformité Article 28) | ✅ Conforme | 2025-10-28 |
| **DPA** (Data Processing Agreement) | ✅ Disponible | 2025-10-28 |
| **Audit sécurité externe** | ⏳ Planifié Q1 2026 | - |
| **Pentest** | ⏳ Planifié Q2 2026 | - |

### Engagement Sécurité

- ✅ **Chiffrement** : TLS 1.3 (transport) + AES-256 (stockage tokens)
- ✅ **Authentification** : 2FA disponible (TOTP)
- ✅ **Backups** : Quotidiens + offsite chiffrés
- ✅ **Monitoring** : 24/7 (UptimeRobot + Sentry)
- ✅ **Logs** : Audit trail (7 ans rétention RGPD)
- ✅ **Mises à jour** : Sécurité appliquées sous 48h

### Notification Incident Sécurité

**En cas de violation de données (data breach)** :
- ⏱️ Notification CNIL : < 72 heures
- 📧 Notification clients affectés : < 72 heures
- 📄 Rapport détaillé : < 7 jours
- 🔍 Investigation + correctifs : < 30 jours

---

## 📊 Monitoring & Transparence

### Métriques Publiques

**Status Page** : https://status.crm.alforis.fr

**Métriques affichées** :
- ✅ Disponibilité (uptime) - 90 jours
- ✅ Temps de réponse moyen API
- ✅ Incidents en cours
- ✅ Maintenances programmées

**Historique** : 90 jours en temps réel, 2 ans archivé

### Rapports Mensuels

**Clients Enterprise uniquement** :

📧 Email automatique le 1er de chaque mois avec :
- 📈 Uptime réel (vs objectif 99,9%)
- ⚡ Performance moyenne (temps réponse)
- 🐛 Incidents survenus + postmortems
- 📦 Nouvelles fonctionnalités déployées
- 🔜 Roadmap mois suivant

---

## 💰 Compensation (Credits SLA)

### Calcul du Crédit

Si disponibilité < objectif SLA pendant un mois :

| Disponibilité réelle | Crédit accordé |
|---------------------|----------------|
| ≥ 99,5% (Team) ou 99,9% (Enterprise) | Aucun |
| 99,0% - 99,5% | 10% de l'abonnement mensuel |
| 98,0% - 99,0% | 25% de l'abonnement mensuel |
| 95,0% - 98,0% | 50% de l'abonnement mensuel |
| < 95,0% | 100% de l'abonnement mensuel + 1 mois gratuit |

**Exemple** :
- Abonnement Team : €99/mois
- Disponibilité août : 98,7%
- Crédit accordé : €24,75 (25%)

### Demande de Crédit

**Procédure** :
1. Email à support@alforis.fr (sous 30 jours après fin du mois)
2. Notre équipe vérifie métriques (3 jours ouvrés)
3. Crédit appliqué sur facture suivante

**Exclusions** :
- Indisponibilité due au client (DNS, réseau)
- Force majeure (cyberattaque nationale, catastrophe)
- Maintenance programmée notifiée

---

## 🔄 Évolution du SLA

### Révision

**Fréquence** : Trimestrielle (janvier, avril, juillet, octobre)

**Modifications possibles** :
- Ajustement objectifs uptime (amélioration)
- Ajout nouvelles métriques
- Révision temps de résolution

**Notification** : Email 30 jours avant application

### Feedback Client

📧 **Enquête satisfaction** : Trimestrielle (NPS - Net Promoter Score)

**Amélioration continue** :
- Analyse incidents récurrents
- Optimisation temps de réponse
- Ajout fonctionnalités demandées

---

## 📞 Contacts

### Support

- **Email** : support@alforis.fr
- **Status page** : https://status.crm.alforis.fr
- **Documentation** : https://docs.crm.alforis.fr (à créer)

### Urgences (Enterprise uniquement)

- **Téléphone** : +33 X XX XX XX XX (Lun-Ven 9h-18h)
- **Astreinte** : Sur demande (forfait dédié)

### Conformité & RGPD

- **DPO** : rgpd@alforis.fr
- **DPA** : https://crm.alforis.fr/legal/dpa
- **Privacy Policy** : https://crm.alforis.fr/legal/privacy

---

## ✅ Acceptation SLA

**Ce SLA fait partie intégrante des Conditions Générales de Vente (CGV).**

En souscrivant à un forfait CRM Alforis, le client accepte les termes de ce SLA.

**Signature électronique** : Lors de la souscription en ligne ou signature manuelle du contrat Enterprise.

---

## 📄 Annexes

### A. Historique Disponibilité

| Mois | Uptime | Incidents majeurs | Maintenance |
|------|--------|-------------------|-------------|
| Janvier 2026 | 99,92% | 0 | 1 (3h) |
| Février 2026 | 99,87% | 1 (2h) | 0 |
| Mars 2026 | 99,95% | 0 | 1 (2h) |

*(Mise à jour mensuelle)*

### B. Définitions

**Disponibilité** : Service accessible via HTTPS avec temps de réponse < 30s sur /health

**Heure ouvrée** : Lundi-Vendredi 9h-18h (UTC+1), hors jours fériés France

**Jour ouvré** : Lundi-Vendredi hors jours fériés France

**Incident** : Toute interruption ou dégradation du service non programmée

**Maintenance programmée** : Intervention planifiée notifiée ≥48h à l'avance

---

**Version** : 1.0
**Dernière révision** : 28 Octobre 2025
**Prochaine révision** : 28 Janvier 2026
**Approuvé par** : Direction ALFORIS FINANCE

---

**Document confidentiel** - Propriété ALFORIS FINANCE
