# 📧 Guide Configuration Emails RGPD - ALFORIS FINANCE

**Date :** 28 Octobre 2025
**Version :** 1.0
**Objectif :** Créer les alias emails rgpd@alforis.fr et support@alforis.fr

---

## 🎯 Emails à Créer

### 1. rgpd@alforis.fr (PRIORITAIRE - Obligatoire RGPD)

**Usage :** Contact DPO / Délégué Protection Données
**Mentionné dans :**
- CGU (Section 5.6)
- Politique de Confidentialité (Section 1, 7, 11)
- DPA
- Footer de toutes les pages

**Volume attendu :** 5-10 emails/mois (demandes RGPD, questions confidentialité)

---

### 2. support@alforis.fr (Recommandé - CGV)

**Usage :** Support technique CRM
**Mentionné dans :**
- CGV (Section 6)

**Volume attendu :** 20-50 emails/mois (support utilisateurs)

---

## 📋 Options de Configuration

### Option A : Alias Email (Recommandé - Gratuit)

**Chez votre hébergeur email actuel** (OVH, Google Workspace, Microsoft 365, etc.)

#### Étapes Génériques

1. **Connexion interface admin**
   - Se connecter au panel admin email (ex: OVH Manager, Google Admin, Microsoft 365 Admin)

2. **Créer alias email**
   - Aller dans "Emails" ou "Comptes" → "Alias"
   - Créer alias : `rgpd@alforis.fr`
   - Rediriger vers : `michel.marques@alforis.fr` (ou email responsable)

3. **Tester l'alias**
   - Envoyer un email test à `rgpd@alforis.fr`
   - Vérifier réception sur email de destination

4. **Répéter pour support@alforis.fr**

---

#### Option A.1 : Google Workspace (Gmail Pro)

**Prérequis :** Domaine alforis.fr configuré dans Google Workspace

**Étapes :**

1. **Connexion Admin Console**
   ```
   URL : https://admin.google.com
   ```

2. **Créer Alias de Groupe**
   - Menu : **Users** → **Manage users**
   - Sélectionner utilisateur (ex: Michel Marques)
   - Cliquer **User information** → **Email aliases**
   - Ajouter alias : `rgpd` (Google ajoutera @alforis.fr automatiquement)
   - Sauvegarder

3. **Alternative : Groupe Email (si plusieurs destinataires)**
   - Menu : **Groups** → **Create group**
   - Nom : "RGPD / DPO"
   - Email : `rgpd@alforis.fr`
   - Ajouter membres : michel.marques@alforis.fr, autre.responsable@alforis.fr
   - Sauvegarder

**Coût :** Inclus dans Google Workspace (pas de surcoût)

---

#### Option A.2 : Microsoft 365 / Outlook

**Prérequis :** Domaine alforis.fr configuré dans Microsoft 365

**Étapes :**

1. **Connexion Admin Center**
   ```
   URL : https://admin.microsoft.com
   ```

2. **Créer Alias**
   - Menu : **Users** → **Active users**
   - Sélectionner utilisateur (Michel Marques)
   - Onglet **Account** → **Manage email aliases**
   - **Add an alias** : `rgpd`
   - Cocher "Set as primary" si souhaité
   - Sauvegarder

3. **Alternative : Boîte aux lettres partagée**
   - Menu : **Teams & groups** → **Shared mailboxes**
   - **Add a shared mailbox**
   - Nom : "RGPD"
   - Email : `rgpd@alforis.fr`
   - Ajouter membres : michel.marques@alforis.fr
   - Sauvegarder

**Coût :** Inclus dans Microsoft 365 (pas de surcoût)

---

#### Option A.3 : OVH (Hébergement Email)

**Prérequis :** Domaine alforis.fr hébergé chez OVH

**Étapes :**

1. **Connexion Manager OVH**
   ```
   URL : https://www.ovh.com/manager/web
   ```

2. **Créer Redirection Email**
   - Menu : **Emails** → Sélectionner `alforis.fr`
   - Onglet **Redirections**
   - **Créer une redirection**
   - De : `rgpd@alforis.fr`
   - Vers : `michel.marques@alforis.fr`
   - Type : **Local** (si destination chez OVH) ou **Externe**
   - Sauvegarder

**Coût :** Gratuit (inclus dans offre email OVH)

---

### Option B : Boîte Email Dédiée (Alternative)

**Si vous voulez une vraie boîte indépendante** (historique, archivage séparé)

#### Avantages
- Historique RGPD séparé (traçabilité CNIL)
- Plusieurs personnes peuvent accéder
- Archivage longue durée (3 ans recommandé RGPD)

#### Coût
- Google Workspace : 6€/mois/boîte
- Microsoft 365 Business Basic : 5€/mois/boîte
- OVH Mail Pro : 3.50€/mois/boîte

#### Configuration (Google Workspace exemple)

1. **Admin Console** : https://admin.google.com
2. **Users** → **Add new user**
3. Prénom : "RGPD"
4. Nom : "ALFORIS"
5. Email : `rgpd@alforis.fr`
6. **Create** → Définir mot de passe temporaire
7. **Accès partagé** : Partager identifiants avec équipe RGPD

---

## ⚙️ Configuration Recommandée FINALE

### Pour rgpd@alforis.fr

**Choix recommandé : Alias ou Boîte partagée**

**Pourquoi ?**
- Obligation RGPD Article 15 : Répondre sous 1 mois
- Traçabilité requise (archivage 3 ans)
- Peut nécessiter plusieurs intervenants (DPO, juriste)

**Ma recommandation :**
→ **Boîte aux lettres partagée** (Microsoft 365 / Google Groups)
→ Membres : Michel Marques + futur DPO (si externe)

---

### Pour support@alforis.fr

**Choix recommandé : Alias simple**

**Pourquoi ?**
- Volume moyen (20-50/mois)
- Gestion technique par équipe existante
- Pas d'obligation légale archivage long

**Ma recommandation :**
→ **Alias** vers michel.marques@alforis.fr (ou équipe support)

---

## 🧪 Tests de Validation

### Test 1 : Envoi Email

```bash
# Depuis un email externe (Gmail, Outlook personnel)
Destinataire : rgpd@alforis.fr
Objet : Test RGPD - Validation alias
Message : "Test de réception alias RGPD"

✅ Vérifier réception dans boîte destination
```

### Test 2 : Réponse Email

```bash
# Depuis boîte destination, répondre au Test 1
✅ Vérifier que l'expéditeur affiché est rgpd@alforis.fr (et non michel.marques@...)
```

### Test 3 : Test depuis CRM

```bash
# Cliquer sur lien mailto:rgpd@alforis.fr dans :
- Footer → Lien RGPD
- Page /legal/privacy → Section "Vos droits"
- Page /legal/cgu → Section 5.6

✅ Vérifier ouverture client email avec destinataire pré-rempli
```

---

## 📨 Modèle Réponse Automatique (Optionnel)

### Auto-réponse rgpd@alforis.fr

**Objet :** Accusé de réception - Demande RGPD

```
Bonjour,

Nous avons bien reçu votre demande concernant vos données personnelles.

Conformément à l'Article 12.3 du RGPD, nous vous répondrons dans un délai maximum de 1 mois à compter de la réception de votre demande.

Si votre demande est complexe, ce délai pourra être prolongé de 2 mois supplémentaires. Nous vous en informerions dans ce cas.

Pour traiter votre demande, nous pourrions avoir besoin de vérifier votre identité. Nous vous contacterons si nécessaire.

Types de demandes traitées :
- Droit d'accès (Article 15 RGPD)
- Droit de rectification (Article 16 RGPD)
- Droit à l'effacement (Article 17 RGPD)
- Droit à la limitation (Article 18 RGPD)
- Droit à la portabilité (Article 20 RGPD)
- Droit d'opposition (Article 21 RGPD)

Vous pouvez également exercer vos droits directement depuis votre compte CRM :
→ Section "Mon Compte" → "Confidentialité & RGPD"

Pour toute réclamation, vous pouvez contacter la CNIL :
https://www.cnil.fr/fr/plaintes

Cordialement,
L'équipe ALFORIS FINANCE

---
ALFORIS FINANCE - SAS au capital de 5 000 €
SIREN : 943 007 229
10 rue de la Bourse – 75002 Paris
https://crm.alforis.fr/legal/privacy
```

---

## 🔐 Sécurité & Bonnes Pratiques

### Pour rgpd@alforis.fr

1. **Chiffrement**
   - Activer chiffrement S/MIME ou PGP si disponible
   - Forcer HTTPS pour accès webmail

2. **Accès restreint**
   - Limiter accès aux personnes autorisées (DPO, direction)
   - Activer 2FA (authentification forte)

3. **Archivage**
   - Conserver emails RGPD pendant 3 ans minimum (preuve conformité)
   - Exporter archives régulièrement (backup hors ligne)

4. **Traçabilité**
   - Logger tous les accès à la boîte (qui, quand, quoi)
   - Documenter les réponses aux demandes RGPD

---

## ✅ Checklist Finale

### Avant Mise en Production

- [ ] **Alias rgpd@alforis.fr créé** (ou boîte dédiée)
- [ ] **Alias support@alforis.fr créé**
- [ ] **Test envoi/réception rgpd@alforis.fr** (OK)
- [ ] **Test envoi/réception support@alforis.fr** (OK)
- [ ] **Test liens mailto depuis CRM** (3 pages)
- [ ] **Auto-réponse rgpd@alforis.fr configurée** (optionnel)
- [ ] **Documentation accès boîte partagée** (si applicable)
- [ ] **2FA activé sur boîte RGPD** (recommandé)
- [ ] **Notification équipe** (qui gère rgpd@alforis.fr ?)

---

## 📞 Support Configuration

### Si Blocage

**Google Workspace :**
- Support Google : https://support.google.com/a/answer/33561
- Chat support disponible (selon plan)

**Microsoft 365 :**
- Support Microsoft : https://admin.microsoft.com/AdminPortal/Home#/support
- Téléphone : 0 805 540 594 (gratuit)

**OVH :**
- Support OVH : https://www.ovh.com/fr/support/
- Guides : https://docs.ovh.com/fr/emails/

---

## 🎯 Prochaine Étape

Une fois les emails créés et testés :

1. ✅ Mettre à jour ce document avec statut
2. ✅ Informer l'équipe (qui répond aux demandes RGPD?)
3. ✅ Former la personne responsable (procédure réponse RGPD)
4. ✅ Documenter dans registre des traitements CNIL

---

## 🐛 Troubleshooting : Webhook Resend

### Problème : CPU 150% + "Signature invalide" en boucle (30 Oct 2025)

**Symptômes :**
- CPU serveur saturé (150%)
- Processus "Killed" par OOM
- Logs : 62+ "❌ Signature invalide - Webhook rejeté" / 100 lignes

**Cause :**
Webhook Resend en boucle infinie → Serveur rejette (401) → Resend réessaie → CPU saturé

**Solution :**

1. **Désactiver temporairement le webhook sur https://resend.com/webhooks**
   - Stoppe l'hémorragie immédiatement

2. **Resynchroniser le secret :**
   ```bash
   # Sur dashboard Resend : Régénérer le signing secret
   # Copier le nouveau whsec_XXX

   # Sur serveur :
   ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
   nano /root/alforis/.env.local
   # Mettre à jour RESEND_SIGNING_SECRET=whsec_XXX
   pm2 restart alforis-site
   ```

3. **Réactiver le webhook et tester**
   ```bash
   # Vérifier logs :
   pm2 logs alforis-site --lines 50
   # Chercher : "✅ Signature vérifiée avec succès"
   ```

**Code webhook validé :** `/root/alforis/app/api/webhooks/resend/route.js`
- Bibliothèque `svix` installée
- Méthode `Webhook.verify()` implémentée

**Debug utile :**
```bash
# Compter erreurs signature
tail -100 /root/.pm2/logs/alforis-site-error.log | grep -c "Signature invalide"

# Vérifier secret actuel
grep RESEND_SIGNING_SECRET /root/alforis/.env.local
```

**Références :**
- Resend Webhooks : https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
- Dashboard : https://resend.com/webhooks

---

**Dernière mise à jour :** 30 Octobre 2025
**Responsable :** Michel Marques
**Contact technique :** [À compléter]
