# 📦 LOT A - Guide d'intégration

**CI/CD + Secrets GitHub** - CRM Alforis v8.3.0

---

## 📋 Fichiers créés

```
V1/
├── .github/
│   ├── SECRETS.md                    ✅ Documentation secrets
│   └── workflows/
│       ├── ci-cd.yml                 ✅ Pipeline complet
│       └── test.yml                  ✅ Tests rapides
├── scripts/
│   └── setup_github_secrets.sh       ✅ Script auto config
└── .env.production.example           ✅ Template production
```

---

## 🚀 Étapes d'intégration

### 1️⃣ Configuration des secrets GitHub (15 min)

**Option A: Via script automatisé (recommandé)**

```bash
# Installer GitHub CLI si nécessaire
brew install gh  # macOS
# ou: https://cli.github.com/packages/githubcli-archive-keyring.gpg

# Authentification
gh auth login

# Exécuter le script
cd scripts
./setup_github_secrets.sh --org alforis --repo crm-v1 --interactive
```

**Option B: Manuelle via l'interface web**

1. Aller sur: `https://github.com/[ORG]/[REPO]/settings/secrets/actions`
2. Cliquer **"New repository secret"**
3. Ajouter les secrets de [.github/SECRETS.md](.github/SECRETS.md)

**Secrets CRITIQUES (minimum)**:
```bash
DATABASE_URL=postgresql://...
SECRET_KEY=$(openssl rand -hex 32)
SENTRY_DSN=https://...
DOCKER_USERNAME=...
DOCKER_PASSWORD=...
SONAR_TOKEN=...
```

### 2️⃣ Validation des secrets (2 min)

```bash
# Lister les secrets configurés
gh secret list -R [ORG]/[REPO]

# Tester via workflow
gh workflow run ci-cd.yml

# Voir les runs
gh run list --limit 5
```

### 3️⃣ Configuration SonarQube (10 min)

**Si SonarCloud**:

1. Aller sur https://sonarcloud.io
2. Créer organization "alforis"
3. Créer projet "alforis-crm"
4. Obtenir le token: Account → Security → Generate Token
5. Ajouter les secrets:
   ```bash
   gh secret set SONAR_TOKEN -b "squ_xxxxx"
   gh secret set SONAR_HOST_URL -b "https://sonarcloud.io"
   gh secret set SONAR_ORGANIZATION -b "alforis"
   ```

**Si SonarQube self-hosted**:

1. Modifier `SONAR_HOST_URL` avec votre instance
2. Configurer le token d'authentification

### 4️⃣ Mise à jour .gitignore (1 min)

Vérifier que `.gitignore` contient:

```gitignore
# Secrets
.env
.env.local
.env.production
.env.staging
*.pem
*.key

# CI artifacts
coverage/
.coverage
*.log
htmlcov/
.pytest_cache/
node_modules/
dist/
build/
```

### 5️⃣ Test du pipeline (5 min)

**Déclencher un build**:

```bash
# Option 1: Push sur une branche
git checkout -b test/ci-cd
git add .
git commit -m "test: Configure CI/CD pipeline"
git push origin test/ci-cd

# Option 2: Workflow manuel
gh workflow run ci-cd.yml --ref main

# Suivre les logs
gh run watch
```

**Vérifier**:
- ✅ Lint backend passe
- ✅ Lint frontend passe
- ✅ Tests backend passent (>70% coverage)
- ✅ Tests frontend passent
- ✅ SonarQube analysis OK
- ✅ Security scan OK

### 6️⃣ Protection des branches (5 min)

Configurer les règles de protection sur `main`:

```bash
# Via gh CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=lint-backend \
  --field required_status_checks[contexts][]=test-backend \
  --field required_status_checks[contexts][]=sonarqube

# Ou via UI: Settings → Branches → Add rule
```

**Règles recommandées**:
- ✅ Require pull request reviews (1 approbation)
- ✅ Require status checks (lint + tests + sonarqube)
- ✅ Require branches to be up to date
- ✅ Include administrators
- ✅ Require linear history

---

## ✅ Checklist de validation

### Configuration

- [ ] **Secrets GitHub configurés** (minimum 10 secrets)
  ```bash
  gh secret list | wc -l  # Doit retourner >= 10
  ```

- [ ] **SonarQube configuré**
  ```bash
  curl -u $SONAR_TOKEN: https://sonarcloud.io/api/projects/search?projects=alforis-crm
  ```

- [ ] **.gitignore à jour** (secrets, coverage, artifacts)

- [ ] **Branch protection activée** sur `main`

### CI/CD Pipeline

- [ ] **Lint backend passe**
  ```bash
  cd crm-backend && black --check . && flake8 .
  ```

- [ ] **Lint frontend passe**
  ```bash
  cd crm-frontend && npm run lint && npx tsc --noEmit
  ```

- [ ] **Tests backend passent** (coverage >70%)
  ```bash
  cd crm-backend && pytest --cov=. --cov-fail-under=70
  ```

- [ ] **Tests frontend passent**
  ```bash
  cd crm-frontend && npm test -- --coverage --watchAll=false
  ```

- [ ] **SonarQube Quality Gate PASSED**

- [ ] **Security scan (Trivy) sans vulnérabilité critique**

- [ ] **Build Docker images OK** (si push sur main)

### Workflows

- [ ] **Workflow ci-cd.yml fonctionne**
  - [ ] Trigger sur push main/develop
  - [ ] Trigger sur PR
  - [ ] Parallélisation OK (lint backend + frontend simultanés)
  - [ ] Cache npm/pip fonctionnel

- [ ] **Workflow test.yml fonctionne** (tests rapides)
  - [ ] Exécution <10 min
  - [ ] Tests isolés sans lint

- [ ] **Notifications Slack** (si configuré)

### Documentation

- [ ] **README à jour** avec badge CI/CD
  ```markdown
  ![CI/CD](https://github.com/[ORG]/[REPO]/actions/workflows/ci-cd.yml/badge.svg)
  ```

- [ ] **SECRETS.md accessible** à l'équipe

- [ ] **Procédure de rotation secrets** documentée

---

## 🔧 Troubleshooting

### Erreur: "SONAR_TOKEN not found"

```bash
# Vérifier que le secret existe
gh secret list | grep SONAR_TOKEN

# Le recréer si nécessaire
gh secret set SONAR_TOKEN -b "votre_token"
```

### Erreur: "Database connection failed" dans les tests

```bash
# Vérifier que le service PostgreSQL démarre bien
# Dans .github/workflows/ci-cd.yml, section services.postgres
# Augmenter les timeouts si nécessaire
```

### Build Docker échoue

```bash
# Vérifier que DOCKER_USERNAME et DOCKER_PASSWORD sont corrects
docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD

# Tester localement
docker build -t test-image -f docker/api/Dockerfile .
```

### Tests lents (>15 min)

```bash
# Utiliser le workflow test.yml pour tests rapides
gh workflow run test.yml

# Ou marquer les tests lents avec @pytest.mark.slow
# et les exclure: pytest -m "not slow"
```

### Quality Gate failed

```bash
# Voir les issues SonarQube
gh run view [RUN_ID] --log-failed

# Corriger les code smells critiques
# Re-push pour re-déclencher l'analyse
```

---

## 📊 Métriques de succès

Après intégration, vous devriez avoir:

- ✅ **Coverage backend**: >70%
- ✅ **Coverage frontend**: >60%
- ✅ **Quality Gate**: PASSED
- ✅ **Build time**: <15 min
- ✅ **0 vulnérabilités** critiques/high
- ✅ **0 secrets** dans le code

---

## 🔄 Maintenance

### Rotation des secrets (tous les 90 jours)

```bash
# Générer nouveaux secrets
NEW_SECRET=$(openssl rand -hex 32)

# Mettre à jour
gh secret set SECRET_KEY -b "$NEW_SECRET"

# Redéployer
gh workflow run ci-cd.yml
```

### Mise à jour des workflows

```bash
# Tester localement avec act (Docker)
brew install act
act -j lint-backend

# Ou via workflow
gh workflow run ci-cd.yml --ref feature/update-ci
```

---

## 📞 Support

- **Documentation workflows**: https://docs.github.com/en/actions
- **SonarQube**: https://docs.sonarcloud.io
- **Slack**: #crm-devops
- **Email**: devops@alforis.com

---

## 🎉 Félicitations !

Le Lot A (Secrets + CI/CD) est maintenant intégré. Vous avez:

✅ Pipeline CI/CD complet
✅ Tests automatisés
✅ Quality gates
✅ Security scanning
✅ Secrets sécurisés

**Prochaine étape**: LOT B (RGPD Anonymisation)

---

**Dernière mise à jour**: 2025-10-26
**Version**: v8.3.0
**Auteur**: Équipe DevOps Alforis
