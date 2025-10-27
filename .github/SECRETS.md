# 🔐 Configuration des Secrets GitHub - CRM Alforis

Ce document liste tous les secrets GitHub requis pour le CRM Alforis v8.3.0.

## 📋 Liste des Secrets Requis

### 🗄️ Base de données

| Secret | Description | Format | Exemple |
|--------|-------------|--------|---------|
| `DATABASE_URL` | URL PostgreSQL production | `postgresql://user:pass@host:5432/db` | `postgresql://crm_user:***@db.alforis.fr:5432/crm_prod` |
| `DATABASE_URL_TEST` | URL PostgreSQL tests | `postgresql://user:pass@host:5432/db_test` | `postgresql://crm_user:***@localhost:5432/crm_test` |

### 🤖 APIs Externes

| Secret | Description | Format | Exemple |
|--------|-------------|--------|---------|
| `ANTHROPIC_API_KEY` | Claude API (AI Agent) | `sk-ant-api...` | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | OpenAI API (fallback) | `sk-...` | `sk-proj-...` |
| `SENDGRID_API_KEY` | SendGrid (email transactionnel) | `SG.` | `SG.xxxxx...` |
| `RESEND_API_KEY` | Resend (email marketing) | `re_` | `re_xxxxx...` |

### 🔐 Authentification & Sécurité

| Secret | Description | Format | Exemple | Commande génération |
|--------|-------------|--------|---------|---------------------|
| `SECRET_KEY` | JWT signing key | 64+ caractères hex | `a1b2c3d4e5f6...` | `openssl rand -hex 32` |
| `WEBHOOK_SECRET` | Validation webhooks entrants | 32+ caractères | `wh_secret_abc123...` | `openssl rand -hex 24` |
| `UNSUBSCRIBE_JWT_SECRET` | JWT pour désabonnement | 64+ caractères hex | `unsub_a1b2c3...` | `openssl rand -hex 32` |

### 📊 Monitoring & Observabilité

| Secret | Description | Format | Exemple |
|--------|-------------|--------|---------|
| `SENTRY_DSN` | Sentry error tracking | `https://...@sentry.io/...` | `https://abc123@o123.ingest.sentry.io/456` |
| `SENTRY_AUTH_TOKEN` | Sentry API (releases) | `sntrys_...` | `sntrys_xxxxx...` |
| `SENTRY_ENVIRONMENT` | Environnement Sentry | `production\|staging` | `production` |

### 🐳 Docker Registry

| Secret | Description | Format | Exemple |
|--------|-------------|--------|---------|
| `DOCKER_USERNAME` | Docker Hub username | string | `alforis` |
| `DOCKER_PASSWORD` | Docker Hub token/password | string | `dckr_pat_xxxxx...` |
| `DOCKER_REGISTRY` | Registry URL (optionnel) | URL | `registry.alforis.fr` |

### 📈 Qualité Code

| Secret | Description | Format | Exemple |
|--------|-------------|--------|---------|
| `SONAR_TOKEN` | SonarQube authentication | `squ_...` | `squ_xxxxx...` |
| `SONAR_HOST_URL` | SonarQube instance URL | URL | `https://sonarcloud.io` |
| `SONAR_ORGANIZATION` | Organisation SonarQube | string | `alforis` |

### 🚀 Déploiement (Optionnel)

| Secret | Description | Format | Exemple |
|--------|-------------|--------|---------|
| `SSH_PRIVATE_KEY` | Clé SSH pour déploiement | PEM format | `-----BEGIN OPENSSH...` |
| `DEPLOY_HOST` | Serveur de production | hostname/IP | `crm.alforis.fr` |
| `DEPLOY_USER` | User SSH | string | `deploy` |
| `SLACK_WEBHOOK_URL` | Notifications Slack | URL | `https://hooks.slack.com/...` |

---

## 🔧 Configuration via GitHub UI

### Méthode 1: Via l'interface web

1. Aller sur le repo GitHub: `https://github.com/[ORG]/[REPO]/settings/secrets/actions`
2. Cliquer sur **"New repository secret"**
3. Ajouter chaque secret de la liste ci-dessus

### Méthode 2: Via GitHub CLI

```bash
# Installer GitHub CLI
brew install gh  # macOS
# ou: curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg

# Authentification
gh auth login

# Ajouter les secrets
gh secret set DATABASE_URL -b "postgresql://user:pass@host:5432/db"
gh secret set ANTHROPIC_API_KEY -b "sk-ant-api..."
gh secret set SECRET_KEY -b "$(openssl rand -hex 32)"
# ... etc
```

### Méthode 3: Via script automatisé

```bash
# Utiliser le script fourni
cd scripts
./setup_github_secrets.sh --org alforis --repo crm-v1
```

---

## 🔒 Secrets par Environnement

### Production

Tous les secrets listés ci-dessus sont requis.

### Staging

Même configuration que production, mais avec:
- `SENTRY_ENVIRONMENT=staging`
- Base de données séparée
- Clés API en mode test si disponible

### Development (local)

Utiliser `.env` local (non committé):
```bash
cp .env.example .env
# Éditer .env avec vos valeurs locales
```

---

## ✅ Validation des Secrets

Après configuration, valider avec:

```bash
# Tester les secrets localement
docker-compose run api python -c "
from core.config import settings
print('DATABASE_URL:', settings.database_url[:20] + '...')
print('SENTRY_DSN:', 'OK' if settings.sentry_dsn else 'MISSING')
print('SECRET_KEY:', 'OK' if len(settings.secret_key) >= 32 else 'TOO SHORT')
"

# Tester via GitHub Actions
gh workflow run ci-cd.yml
gh run list --limit 1
```

---

## 🛡️ Bonnes Pratiques

### ✅ À FAIRE

- ✅ Utiliser des tokens avec **expiration** (quand possible)
- ✅ **Rotation régulière** des secrets (tous les 90 jours)
- ✅ **Principe du moindre privilège** (permissions minimales)
- ✅ Secrets différents par **environnement**
- ✅ **Audit trail** des accès (GitHub logs)
- ✅ **Documentation à jour** de tous les secrets

### ❌ À ÉVITER

- ❌ **Jamais** commiter de secrets dans le code
- ❌ **Jamais** logger les secrets en clair
- ❌ **Jamais** partager les secrets via Slack/Email
- ❌ **Jamais** réutiliser les mêmes secrets entre projets
- ❌ **Jamais** utiliser des mots de passe faibles

---

## 🚨 En cas de fuite

Si un secret est compromis:

1. **Révoquer immédiatement** le secret chez le provider
2. **Générer un nouveau** secret
3. **Mettre à jour** dans GitHub Secrets
4. **Re-déployer** l'application
5. **Investiguer** l'origine de la fuite
6. **Documenter** l'incident

---

## 📞 Support

- **Documentation GitHub**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Support interne**: dev@alforis.com
- **Emergency**: Signal group "CRM DevOps"

---

**Dernière mise à jour**: 2025-10-26
**Version**: v8.3.0
**Responsable**: Équipe DevOps Alforis
