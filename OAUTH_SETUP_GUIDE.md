# 🔐 OAuth Apps Setup - Guide Rapide

**Date:** 31 Octobre 2025
**Objectif:** Activer Gmail + Outlook dans Multi-Mail
**Durée estimée:** 1h

---

## 🚨 BLOQUANT ACTUEL

Multi-Mail est **déployé et fonctionnel** SAUF :
- ❌ Gmail OAuth (Google Cloud Console app manquante)
- ❌ Outlook OAuth (Azure Portal app manquante)

**Impact:** Users ne peuvent pas connecter leurs comptes Gmail/Outlook.

---

## 📋 Checklist OAuth Setup

### 1️⃣ Google Cloud Console - Gmail OAuth (30min)

#### Étape 1: Créer le projet
1. Va sur [Google Cloud Console](https://console.cloud.google.com/)
2. Clique "Select a project" → "New Project"
3. Nom: `CRM Alforis Finance`
4. Clique "Create"

#### Étape 2: Activer Gmail API
1. Menu hamburger → "APIs & Services" → "Library"
2. Cherche "Gmail API"
3. Clique "Enable"

#### Étape 3: Créer OAuth credentials
1. "APIs & Services" → "Credentials"
2. Clique "Create Credentials" → "OAuth client ID"
3. Si premier OAuth: Configure "OAuth consent screen"
   - User Type: **External** (ou Internal si Google Workspace)
   - App name: `CRM Alforis Finance`
   - User support email: ton email
   - Developer contact: ton email
   - Scopes: Ajouter `gmail.readonly`, `gmail.send`
   - Test users: Ajoute tes emails de test
   - Save

4. Retour à "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `CRM Alforis - Gmail Integration`
   - Authorized redirect URIs:
     ```
     https://crm.alforis.fr/api/v1/oauth/google/callback
     http://localhost:8000/api/v1/oauth/google/callback
     ```
   - Clique "Create"

5. **IMPORTANT:** Copie les credentials
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

#### Étape 4: Variables .env production
Ajoute dans `.env` sur serveur Hetzner :
```bash
# Google OAuth
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
```

---

### 2️⃣ Azure Portal - Outlook OAuth (30min)

#### Étape 1: Créer l'app
1. Va sur [Azure Portal](https://portal.azure.com/)
2. Cherche "Azure Active Directory" (ou "Microsoft Entra ID")
3. Menu gauche → "App registrations"
4. Clique "New registration"
5. Remplis:
   - Name: `CRM Alforis Finance`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Platform: **Web**
     - URL: `https://crm.alforis.fr/api/v1/oauth/microsoft/callback`
   - Clique "Register"

#### Étape 2: Copier l'Application ID
1. Sur la page Overview de l'app
2. Copie **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

#### Étape 3: Créer un Client Secret
1. Menu gauche → "Certificates & secrets"
2. Clique "New client secret"
3. Description: `CRM Production`
4. Expires: **24 months** (recommandé)
5. Clique "Add"
6. **IMPORTANT:** Copie immédiatement la **Value** (elle disparaît après)
   - Secret Value: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Étape 4: Configurer API permissions
1. Menu gauche → "API permissions"
2. Clique "Add a permission"
3. Choisis "Microsoft Graph"
4. Choisis "Delegated permissions"
5. Ajoute ces scopes:
   - `Mail.Read` (Lire emails)
   - `Mail.Send` (Envoyer emails)
   - `Mail.ReadWrite` (Modifier emails - optionnel)
   - `offline_access` (Refresh token)
   - `User.Read` (Profil basique)
6. Clique "Add permissions"
7. **Important:** Clique "Grant admin consent for [organization]" (si admin)

#### Étape 5: Ajouter redirect URI localhost (dev)
1. Menu gauche → "Authentication"
2. Sous "Redirect URIs", clique "Add URI"
3. Ajoute: `http://localhost:8000/api/v1/oauth/microsoft/callback`
4. Save

#### Étape 6: Variables .env production
Ajoute dans `.env` sur serveur Hetzner :
```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MICROSOFT_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
MICROSOFT_TENANT_ID="common"  # ou ton tenant ID si Azure AD
```

---

## 3️⃣ Déploiement & Tests (15min)

### Déployer nouvelles variables
```bash
# SSH sur Hetzner
ssh root@crm.alforis.fr

# Éditer .env
cd /srv/crm-alforis
nano .env

# Ajouter les 5 variables OAuth (voir ci-dessus)

# Redémarrer services
docker compose restart api celery-worker celery-beat

# Vérifier logs
docker compose logs -f api | grep -i oauth
```

### Tester Gmail OAuth
```bash
# 1. Ouvrir le frontend
https://crm.alforis.fr/dashboard/settings/integrations

# 2. Cliquer "Connect Gmail"
# 3. Autoriser l'app Google
# 4. Vérifier redirection OK
# 5. Checker DB: user_email_accounts table
docker compose exec db psql -U crm_user crm_db -c \
  "SELECT id, user_id, email, provider, is_active FROM user_email_accounts;"
```

### Tester Outlook OAuth
```bash
# 1. Ouvrir le frontend
https://crm.alforis.fr/dashboard/settings/integrations

# 2. Cliquer "Connect Outlook"
# 3. Autoriser l'app Microsoft
# 4. Vérifier redirection OK
# 5. Checker DB (même commande ci-dessus)
```

---

## 🎯 Validation Multi-Mail Complet

Une fois OAuth configuré, valide le stack complet :

```bash
# 1. Connecter 2 comptes (Gmail + Outlook)
Via UI: /dashboard/settings/integrations

# 2. Déclencher sync manuel
curl -X POST https://crm.alforis.fr/api/v1/emails/sync \
  -H "Authorization: Bearer $TOKEN"

# 3. Vérifier Celery traite les emails
https://crm.alforis.fr:5555  # Flower UI

# 4. Vérifier emails importés
https://crm.alforis.fr/dashboard/emails

# 5. Vérifier NLP extraction
docker compose exec api python3 -c "
import spacy
nlp = spacy.load('fr_core_news_lg')
doc = nlp('Jean Dupont travaille chez ACME à Paris. Tel: +33612345678')
for ent in doc.ents:
    print(f'{ent.text} ({ent.label_})')
"

# 6. Vérifier Thread detection
SELECT thread_id, COUNT(*) as email_count
FROM email_messages
WHERE thread_id IS NOT NULL
GROUP BY thread_id
HAVING COUNT(*) > 1;
```

---

## 🔒 Sécurité

### Google Cloud Console
- ✅ OAuth consent screen en mode "Testing" au début
- ⚠️ Passer en "Production" après validation (nécessite review Google)
- ✅ Limiter les scopes au minimum (Gmail.Read + Gmail.Send)
- ✅ Ajouter des test users pour tester en mode "Testing"

### Azure Portal
- ✅ Rotate Client Secret tous les 24 mois
- ✅ Grant admin consent si possible (évite popup pour chaque user)
- ✅ Limiter les scopes au minimum (Mail.Read, Mail.Send, offline_access)
- ⚠️ Si multi-tenant, utiliser `common` pour TENANT_ID

### Variables .env
- ❌ **JAMAIS** commit les secrets dans Git
- ✅ Utiliser `.env` uniquement (déjà dans .gitignore)
- ✅ Backup .env dans password manager (1Password, Bitwarden, etc.)

---

## 🐛 Troubleshooting

### Erreur "Redirect URI mismatch"
**Cause:** L'URI de callback ne match pas exactement celle configurée dans Google/Azure

**Solution:**
- Vérifier que l'URI inclut HTTPS (pas HTTP) en prod
- Vérifier pas de trailing slash
- Vérifier le port (8000 en dev, 443 en prod via nginx)

### Erreur "Invalid client"
**Cause:** Client ID ou Secret incorrect

**Solution:**
- Re-copier Client ID + Secret depuis console
- Vérifier pas d'espaces avant/après dans .env
- Redémarrer API après modification .env

### Erreur "Scope not granted"
**Cause:** Scopes manquants ou pas de consent admin

**Solution (Azure):**
- Retourner dans "API permissions"
- Vérifier que les scopes sont bien ajoutés
- Cliquer "Grant admin consent"

**Solution (Google):**
- Retourner dans "OAuth consent screen"
- Ajouter les scopes manquants
- Sauvegarder

### Token expire trop vite
**Cause:** Pas de refresh token

**Solution (Microsoft):**
- Ajouter scope `offline_access` dans Azure Portal
- Re-connecter le compte Outlook

**Solution (Google):**
- Scope `https://www.googleapis.com/auth/gmail.readonly` inclut déjà refresh token
- Vérifier access_type=offline dans OAuth URL

---

## ✅ Checklist Final

- [ ] Google Cloud Console app créée
- [ ] Gmail API activée
- [ ] OAuth consent screen configuré
- [ ] Redirect URIs ajoutés (prod + dev)
- [ ] Client ID + Secret copiés

- [ ] Azure Portal app créée
- [ ] API permissions configurées (Mail.Read, Mail.Send, offline_access)
- [ ] Admin consent granted
- [ ] Client Secret créé et copié
- [ ] Redirect URIs ajoutés (prod + dev)

- [ ] Variables .env ajoutées sur serveur
- [ ] Services API/Celery redémarrés
- [ ] Test Gmail OAuth via UI
- [ ] Test Outlook OAuth via UI
- [ ] Vérification DB (user_email_accounts)

- [ ] Sync manuel déclenché
- [ ] Flower monitoring vérifié
- [ ] Emails importés dans dashboard
- [ ] NLP extraction testée
- [ ] Thread detection validée

---

**Status actuel:**
- ✅ Multi-Mail stack déployé
- ✅ Celery opérationnel
- ✅ spaCy NLP ready
- ✅ Thread detection ready
- ❌ OAuth Apps **À CONFIGURER** (1h)

**Après OAuth setup:**
🎉 Multi-Mail 100% opérationnel !
