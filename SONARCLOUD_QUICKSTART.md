# 🚀 SonarCloud - Quick Start (5 minutes)

Guide ultra-rapide pour activer SonarCloud sur ton projet.

## ⚡ Quick Setup (3 étapes)

### 1️⃣ Créer compte + Importer projet (2 min)

1. **Ouvrir:** https://sonarcloud.io
2. **Cliquer:** "Log in" → "Continue with GitHub"
3. **Autoriser** SonarCloud
4. **Cliquer:** "+" → "Analyze new project"
5. **Sélectionner:** `MichelAlforis/crm-alforis`
6. **Choisir:** "With GitHub Actions"

### 2️⃣ Copier les secrets (1 min)

SonarCloud va te montrer cette page:

```
Your project is ready!

SONAR_TOKEN: sqp_abc123def456...
Organization Key: michelalforis (ou ton username)
```

**Copie ces 2 valeurs!**

### 3️⃣ Ajouter à GitHub (2 min)

1. **Ouvrir:** https://github.com/MichelAlforis/crm-alforis/settings/secrets/actions
2. **Cliquer:** "New repository secret" (3 fois)

**Secret 1:**
```
Name: SONAR_TOKEN
Value: [colle le token de l'étape 2]
```

**Secret 2:**
```
Name: SONAR_ORGANIZATION
Value: [colle l'organization key de l'étape 2]
```

**Secret 3:**
```
Name: SONAR_HOST_URL
Value: https://sonarcloud.io
```

## ✅ C'est tout!

Push n'importe quoi:
```bash
git commit --allow-empty -m "test: SonarCloud"
git push
```

Regarde **GitHub Actions** → Le job "📊 SonarQube Analysis" devrait tourner!

Résultat dans ~3 minutes: https://sonarcloud.io/project/overview?id=alforis-crm

---

## 📊 Ce que tu vas voir

Une fois le scan terminé:

```
✅ Quality Gate: PASSED

Bugs: 12
Security Vulnerabilities: 3
Code Smells: 248
Coverage: 68.2%
Duplications: 2.8%
```

**Dashboard complet:** https://sonarcloud.io/dashboard?id=alforis-crm

---

## 🔥 Pro Tips

### Badge dans README
Ajoute ça dans ton README.md:

```markdown
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=alforis-crm&metric=alert_status)](https://sonarcloud.io/dashboard?id=alforis-crm)
```

### Activer PR comments
SonarCloud → Project Settings → Pull Request Decoration → Enable

### Quality Gate plus strict
SonarCloud → Quality Gates → Copy "Sonar way" → Personnaliser:
- Coverage: 70% minimum
- Duplications: 3% maximum

---

## ❓ Questions Fréquentes

**Q: C'est gratuit?**
A: Oui! Gratuit pour projets privés jusqu'à 100k lignes de code.

**Q: Ça prend combien de temps?**
A: Premier scan: ~5-10min. Scans suivants: ~2-3min.

**Q: C'est obligatoire?**
A: Non! Le CI/CD passe même sans SonarCloud (job skipped).

**Q: Je peux désactiver temporairement?**
A: Oui! Supprime `SONAR_TOKEN` des secrets → job skip automatiquement.

**Q: Erreur "Project not found"?**
A: Vérifie que tu as bien importé `crm-alforis` dans SonarCloud (étape 1).

---

**Besoin d'aide?** Lis `SONARCLOUD_SETUP.md` pour le guide complet!
