# 📊 SonarCloud Setup Guide

Guide complet pour configurer SonarCloud sur le projet CRM Alforis.

## 🎯 Pourquoi SonarCloud?

- ✅ **Gratuit** pour projets open source et projets privés (14 jours trial)
- ✅ **Pas de self-hosting** (cloud-based)
- ✅ **Intégration GitHub native**
- ✅ **Analyse automatique** à chaque push/PR
- ✅ **Quality Gates** configurables
- ✅ **Support TypeScript + Python**

## 📋 Étapes de Configuration

### 1. Créer un compte SonarCloud

1. Aller sur https://sonarcloud.io
2. Cliquer sur **"Log in"**
3. Choisir **"Continue with GitHub"**
4. Autoriser SonarCloud à accéder à ton compte GitHub

### 2. Créer une organisation

1. Dans SonarCloud, cliquer sur **"+"** → **"Analyze new project"**
2. Choisir ton organisation GitHub: **MichelAlforis** (ou créer une nouvelle)
3. Importer le repository: **crm-alforis**

### 3. Configurer le projet

1. **Project Key**: `alforis-crm` (déjà configuré dans `sonar-project.properties`)
2. **Project Name**: `Alforis CRM`
3. Choisir **"With GitHub Actions"** comme méthode d'analyse

### 4. Obtenir les secrets

SonarCloud va te donner 3 secrets à copier:

#### a) SONAR_TOKEN
```
Settings → Security → Generate Token
Nom: "GitHub Actions"
Type: "User Token"
Expiration: "No expiration"
```
Copie le token généré.

#### b) SONAR_ORGANIZATION
```
Ton organization key (ex: "michelalforis" ou "alforis")
```

#### c) SONAR_HOST_URL
```
Pour SonarCloud, c'est toujours:
https://sonarcloud.io
```

### 5. Ajouter les secrets à GitHub

1. Aller sur https://github.com/MichelAlforis/crm-alforis
2. **Settings** → **Secrets and variables** → **Actions**
3. Cliquer **"New repository secret"** pour chaque:

```
Name: SONAR_TOKEN
Value: [colle le token de l'étape 4a]

Name: SONAR_ORGANIZATION
Value: [colle l'organization key de l'étape 4b]

Name: SONAR_HOST_URL
Value: https://sonarcloud.io
```

### 6. Tester l'intégration

1. Fais un commit dummy:
```bash
git commit --allow-empty -m "test: Trigger SonarCloud scan"
git push
```

2. Va dans **Actions** → Regarde le job **"📊 SonarQube Analysis"**

3. Si tout marche, tu verras:
```
✅ SonarQube Analysis
   → Quality Gate passed
   → View results: https://sonarcloud.io/dashboard?id=alforis-crm
```

## 📊 Quality Gates (Optionnel)

Une fois configuré, tu peux définir des seuils de qualité:

### Dans SonarCloud:
1. **Project Settings** → **Quality Gates**
2. Personnaliser les seuils:
   - Coverage: minimum 70%
   - Duplicated Lines: maximum 3%
   - Maintainability Rating: A
   - Security Rating: A
   - Reliability Rating: A

### Rendre le Quality Gate bloquant (optionnel):

Dans `.github/workflows/ci-cd.yml`, change ligne 388:
```yaml
# Avant
sonar.qualitygate.wait=false

# Après (bloque si Quality Gate fail)
sonar.qualitygate.wait=true
```

## 🎨 Badge SonarCloud (Optionnel)

Ajoute un badge dans ton README.md:

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=alforis-crm&metric=alert_status)](https://sonarcloud.io/dashboard?id=alforis-crm)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=alforis-crm&metric=coverage)](https://sonarcloud.io/dashboard?id=alforis-crm)

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=alforis-crm&metric=security_rating)](https://sonarcloud.io/dashboard?id=alforis-crm)
```

## 🔧 Fichiers déjà configurés

✅ `sonar-project.properties` - Configuration complète du projet
✅ `.github/workflows/ci-cd.yml` - Job SonarQube intégré
✅ Coverage reports configurés:
  - Frontend: `crm-frontend/coverage/lcov.info`
  - Backend: `crm-backend/coverage.xml`

## 📈 Métriques analysées

SonarCloud va analyser:

### Code Quality
- 🐛 **Bugs**: Erreurs potentielles
- 🔒 **Vulnerabilities**: Failles de sécurité
- 💩 **Code Smells**: Mauvaises pratiques
- 📊 **Coverage**: Couverture de tests
- 🔄 **Duplications**: Code dupliqué
- 📏 **Complexity**: Complexité cyclomatique

### Languages supportés
- ✅ TypeScript/JavaScript (Frontend Next.js)
- ✅ Python (Backend FastAPI)
- ✅ JSON, YAML, Markdown

## 🚀 Résultat attendu

Après setup, chaque commit/PR aura:
- ✅ Scan automatique SonarCloud
- ✅ Rapport de qualité visible
- ✅ Commentaires PR automatiques (si configuré)
- ✅ Dashboard temps réel: https://sonarcloud.io/project/overview?id=alforis-crm

## 🆘 Troubleshooting

### Error: "SONAR_TOKEN not found"
→ Vérifie que le secret est bien ajouté dans GitHub Settings → Secrets

### Error: "Project not found"
→ Vérifie que `sonar.projectKey=alforis-crm` correspond au projet créé dans SonarCloud

### Analysis takes too long
→ Normal pour le premier scan (10-15min). Les suivants seront plus rapides (2-3min)

### Quality Gate fails
→ C'est normal au début! Améliore progressivement:
1. Fix les Security issues (priorité haute)
2. Fix les Bugs (priorité haute)
3. Améliore la coverage (progressif)
4. Refactor les Code Smells (progressif)

## 📚 Resources

- [SonarCloud Docs](https://docs.sonarcloud.io/)
- [GitHub Actions Integration](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/github-actions/)
- [Quality Gates](https://docs.sonarcloud.io/improving/quality-gates/)

---

**Questions?** Ouvre une issue sur GitHub!
